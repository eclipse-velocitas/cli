// Copyright (c) 2023-2024 Contributors to the Eclipse Foundation
//
// This program and the accompanying materials are made available under the
// terms of the Apache License, Version 2.0 which is available at
// https://www.apache.org/licenses/LICENSE-2.0.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.
//
// SPDX-License-Identifier: Apache-2.0

import { Command, Flags } from '@oclif/core';
import { ProjectConfig } from '../../modules/project-config';
import { sdkDownloader } from '../../modules/package-downloader';
import { SdkConfig } from '../../modules/sdk';
import { awaitSpawn } from '../../modules/exec';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Init from '../init';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Sync from '../sync';
import { PackageIndex, Core, Extension, ParameterSet, Value, Parameter } from '../../modules/package-index';
import { AppManifest, AppManifestInterfaceEntry } from '../../modules/app-manifest';

// inquirer >= v9 is an ESM package.
// We are not using ESM in our CLI,
// We need to set moduleResolution to node16 in tsconfig.json
// and import inquirer using "await import"
// @ts-ignore: declaration file not found
const inquirer = require('inquirer');

interface CorePromptResult {
    chosenCore?: Core;
    example?: boolean;
    appName?: string;
}

interface CreateDataConfig {
    name: string;
    language: string;
    appManifest: AppManifest;
    example: boolean;
}

class CreateData implements CreateDataConfig {
    name: string;
    language: string;
    appManifest: AppManifest;
    example: boolean;

    constructor(coreId: string, appName: string, example: boolean, interfaceEntries: AppManifestInterfaceEntry[]) {
        this.name = appName;
        this.language = this._parseLanguage(coreId);
        this.example = example;
        this.appManifest = new AppManifest(appName, interfaceEntries);
    }

    private _parseLanguage(coreId: string): string {
        const coreIdSplittedArray: string[] = coreId.split('-');
        return coreIdSplittedArray[coreIdSplittedArray.length - 2];
    }
}

export default class Create extends Command {
    static description = 'Create a new Velocitas Vehicle App project.';

    static examples = [
        `$ velocitas create -n VApp -l python ...
        Creating a new Velocitas project ...`,
    ];

    static flags = {
        name: Flags.string({ char: 'n', description: 'Name of the Vehicle App.', required: false }),
        core: Flags.string({
            char: 'c',
            description: 'Which core to use for the project.',
            required: false,
        }),
        example: Flags.string({
            char: 'e',
            description: 'Use an example upon which to base your Vehicle App.',
            required: false,
        }),
        interface: Flags.string({
            char: 'i',
            description: 'Functional interface your Vehicle App should use.',
            required: false,
            multiple: true,
        }),
    };

    static prompts = {
        core: (availableCores: Core[]) => {
            return {
                name: 'core',
                prefix: '>',
                message: 'What kind of project would you like to create?',
                type: 'list',
                choices: () => availableCores.map((core: Core) => ({ name: core.name, value: core })),
            };
        },
        parameterSets: (sets: ParameterSet[]) => {
            return {
                name: 'parameterSet',
                prefix: '>',
                message: 'Which flavor?',
                type: 'list',
                choices: () => sets.map((parameterSet: ParameterSet) => ({ name: parameterSet.name, value: sets.indexOf(parameterSet) })),
            };
        },
        coreParameters: (parameter: Parameter) => {
            return {
                name: 'coreParameter',
                prefix: '>',
                message: parameter.description,
                default: parameter.default,
                type: parameter.type,
                choices: () => (parameter.values || []).map((value: Value) => ({ name: value.description, value: value.id })),
            };
        },
        extensions: (availableExtensions: Extension[]) => {
            return {
                name: 'extensions',
                prefix: '>',
                message: 'Which extensions do you want to use?',
                type: 'checkbox',
                choices: () => availableExtensions.map((ext: Extension) => ({ name: ext.name, value: ext })),
            };
        },
        extensionParameters: (parameter: Parameter) => {
            return {
                name: 'extensionParameter',
                prefix: '>',
                message: parameter.description,
                default: parameter.default,
                type: parameter.type,
            };
        },
    };

    private async _configureCore(availableCores: Core[]): Promise<CorePromptResult> {
        let corePromptResult: CorePromptResult = {
            chosenCore: undefined,
            example: undefined,
            appName: undefined,
        };
        let promptResult = await inquirer.prompt(Create.prompts.core(availableCores));

        corePromptResult.chosenCore = promptResult.core as Core;

        const sets = corePromptResult.chosenCore.parameterSets;
        if (sets !== undefined) {
            let chosenParamSetId = 0;
            if (sets.length > 0) {
                const parameterSetPromptResult = await inquirer.prompt(Create.prompts.parameterSets(sets));
                chosenParamSetId = parameterSetPromptResult.parameterSet;
            }

            for (const parameter of sets[chosenParamSetId].parameters) {
                const coreParametersPromptResult = await inquirer.prompt(Create.prompts.coreParameters(parameter));
                if (parameter.id === 'example') {
                    corePromptResult.example = true;
                    corePromptResult.appName = coreParametersPromptResult.coreParameter;
                }
                if (parameter.id === 'name') {
                    corePromptResult.example = false;
                    corePromptResult.appName = coreParametersPromptResult.coreParameter;
                }
            }
        }
        return corePromptResult;
    }

    private async _configureExtension(
        packageIndex: PackageIndex,
        corePromptResult: CorePromptResult,
    ): Promise<AppManifestInterfaceEntry[]> {
        const appManifestInterfaceEntries: AppManifestInterfaceEntry[] = [];
        if (corePromptResult.example) {
            return appManifestInterfaceEntries;
        }
        const availableExtensions = packageIndex
            .getExtensions()
            .filter((ext: Extension) =>
                ext.compatibleCores.find((compatibleCore: string) => compatibleCore === corePromptResult.chosenCore!.id),
            );

        if (availableExtensions.length === 0) {
            return appManifestInterfaceEntries;
        }

        let extensionPromptResult = await inquirer.prompt(Create.prompts.extensions(availableExtensions));

        for (const selectedExtension of extensionPromptResult.extensions) {
            const typedExtension = selectedExtension as Extension;
            appManifestInterfaceEntries.push(await this._createAppManifestInterfaceEntry(typedExtension.id, typedExtension.parameters!));
        }
        return appManifestInterfaceEntries;
    }

    private async _createAppManifestInterfaceEntry(extensionId: string, parameters: Parameter[]): Promise<AppManifestInterfaceEntry> {
        this.log(`Configure extension '${extensionId}'`);
        const appManifestInterfaceEntry: AppManifestInterfaceEntry = { type: extensionId, config: {} };
        for (const parameter of parameters) {
            const extensionPromptResult = await inquirer.prompt(Create.prompts.extensionParameters(parameter));
            appManifestInterfaceEntry.config[parameter.id] = extensionPromptResult.extensionParameter;
        }
        return appManifestInterfaceEntry;
    }

    private async _parseFlags(packageIndex: PackageIndex, flags: any): Promise<CreateData> {
        let appManifestInterfaceEntries: AppManifestInterfaceEntry[] = [];

        if (flags.name && flags.example) {
            throw new Error("Flags 'name' and 'example' are mutually exclusive!");
        }
        if (flags.example) {
            flags.name = flags.example;
        }
        if (!flags.name) {
            throw new Error("Missing required flag 'name'");
        }
        if (!flags.core) {
            throw new Error("Missing required flag 'core'");
        }
        if (flags.interface) {
            for (const interfaceEntry of flags.interface) {
                const interfaceParameters = packageIndex.getExtensionParametersByParameterId(interfaceEntry);
                if (interfaceParameters) {
                    appManifestInterfaceEntries.push(await this._createAppManifestInterfaceEntry(interfaceEntry, interfaceParameters!));
                }
            }
        }
        const createData: CreateData = new CreateData(flags.core, flags.name, flags.example ? true : false, appManifestInterfaceEntries);
        return createData;
    }

    private async _runInteractiveMode(packageIndex: PackageIndex): Promise<CreateData> {
        const availableCores = packageIndex.getCores();
        const corePromptResult = await this._configureCore(availableCores);
        const appManifestInterfaceEntries = await this._configureExtension(packageIndex, corePromptResult);
        const createData: CreateData = new CreateData(
            corePromptResult.chosenCore!.id,
            corePromptResult.appName!,
            corePromptResult.example!,
            appManifestInterfaceEntries,
        );
        return createData;
    }

    private _loadDataFromPackageIndex(packageIndex: PackageIndex) {
        Create.flags.core.options = packageIndex.getCores().map((core: Core) => {
            return core.id;
        });
        Create.flags.interface.options = packageIndex.getExtensions().map((ext: Extension) => {
            return ext.id;
        });
    }

    private _getScriptExecutionPath(sdkConfig: SdkConfig): string {
        const basePath = process.env.VELOCITAS_SDK_PATH_OVERRIDE
            ? process.env.VELOCITAS_SDK_PATH_OVERRIDE
            : join(sdkConfig.getPackageDirectory(), 'latest');

        return join(basePath, '.project-creation', 'run.py');
    }

    async run(): Promise<void> {
        let createData: CreateData;
        const packageIndex = PackageIndex.read();
        this._loadDataFromPackageIndex(packageIndex);

        const { flags } = await this.parse(Create);
        this.log(`Creating a new Velocitas project ...`);

        if (Object.keys(flags).length === 0) {
            this.log('Interactive project creation started');
            createData = await this._runInteractiveMode(packageIndex);
        } else {
            createData = await this._parseFlags(packageIndex, flags);
        }

        await ProjectConfig.create(packageIndex.getPackages(), createData.language, this.config.version);
        createData.appManifest.write();
        const sdkConfig = new SdkConfig(createData.language);
        await sdkDownloader(sdkConfig).downloadPackage({ checkVersionOnly: false });

        const result = await awaitSpawn(
            `python3`,
            [this._getScriptExecutionPath(sdkConfig), '-d', process.cwd(), '-e', createData.example ? createData.name : ''],
            process.cwd(),
            process.env,
            true,
        );

        if (result === null || result.exitCode !== 0) {
            this.error('Unable to execute create script!');
        }

        this.log(`... Project for Vehicle Application '${createData.name}' created!`);
        await Init.run(['--no-hooks']);
        await Sync.run([]);
    }
}
