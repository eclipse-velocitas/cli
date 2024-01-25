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
import { packageDownloader } from '../../modules/package-downloader';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Exec from '../exec';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Init from '../init';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Sync from '../sync';
import { PackageIndex, Core, Extension, CoreOptions, DescribedValue, Parameter, PackageAttributes } from '../../modules/package-index';
import { AppManifest, AppManifestInterfaceAttributes } from '../../modules/app-manifest';
import { InteractiveMode } from '../../modules/create-interactive';
import { PackageConfig } from '../../modules/package';

// inquirer >= v9 is an ESM package.
// We are not using ESM in our CLI,
// We need to set moduleResolution to node16 in tsconfig.json
// and import inquirer using "await import"
// @ts-ignore: declaration file not found
const inquirer = require('inquirer');

/**
 * Configuration data for creating a new Velocitas Vehicle App project.
 * @interface CreateDataConfig
 * @prop {string} name - Name of the Vehicle App.
 * @prop {string} coreId - The ID of the selected core.
 * @prop {AppManifest} appManifest - App manifest for the project.
 * @prop {boolean} example - Indicates whether to use an example.
 */
interface CreateDataConfig {
    name: string;
    coreId: string;
    appManifest: AppManifest;
    packages: PackageAttributes[];
    example: boolean;
}

/**
 * Represents the data needed for creating a new project.
 * @class
 * @implements {CreateDataConfig}
 */
class CreateData implements CreateDataConfig {
    name: string;
    coreId: string;
    appManifest: AppManifest;
    packages: PackageAttributes[];
    example: boolean = false;

    /**
     * Constructor for CreateData.
     * @constructor
     * @param {string} coreId - The ID of the selected core.
     * @param {string} appName - The name of the application.
     * @param {boolean} example - Indicates if an example should be used.
     * @param {AppManifestInterfaceAttributes[]} interfaceAttributes - Interface attributes for the app manifest.
     */
    constructor(coreId: string, appName: string, example: boolean, interfaceAttributes: AppManifestInterfaceAttributes[]) {
        this.name = appName;
        this.coreId = coreId;
        this.appManifest = new AppManifest(appName, interfaceAttributes);
        this.packages = this._parsePackages(coreId, interfaceAttributes);
        this.example = example;
    }

    private _parsePackages(coreId: string, interfaceAttributes: AppManifestInterfaceAttributes[]): PackageAttributes[] {
        const packageIndex = PackageIndex.read();
        const selectedPackagesSet = new Set<PackageAttributes>();

        interfaceAttributes.forEach((interfaceAttribute: AppManifestInterfaceAttributes) => {
            const packageAttribute = packageIndex.getPackageByComponentId(interfaceAttribute.type);
            selectedPackagesSet.add(packageAttribute);
        });
        const corePackage = packageIndex.getPackageByComponentId(coreId);
        selectedPackagesSet.add(corePackage);

        packageIndex.getMandatoryPackages().forEach((packageAttribute: PackageAttributes) => {
            selectedPackagesSet.add(packageAttribute);
        });
        const selectedPackages = Array.from(selectedPackagesSet);

        return selectedPackages;
    }
}

export default class Create extends Command {
    static description = 'Create a new Velocitas Vehicle App project.';

    static examples = [
        `$ velocitas create -n VApp -c vehicle-app-python-core ...
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
        coreOptions: (coreOptions: CoreOptions[]) => {
            return {
                name: 'coreOptions',
                prefix: '>',
                message: 'Which flavor?',
                type: 'list',
                choices: () =>
                    coreOptions.map((coreOption: CoreOptions) => ({ name: coreOption.name, value: coreOptions.indexOf(coreOption) })),
            };
        },
        coreParameters: (parameter: Parameter) => {
            return {
                name: 'coreParameter',
                prefix: '>',
                message: parameter.description,
                default: parameter.default,
                type: parameter.type,
                choices: () => (parameter.values || []).map((value: DescribedValue) => ({ name: value.description, value: value.id })),
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

    static async createAppManifestInterfaceAttributes(
        extensionId: string,
        parameters: Parameter[],
    ): Promise<AppManifestInterfaceAttributes> {
        console.log(`Configure extension '${extensionId}'`);
        const appManifestInterfaceEntry: AppManifestInterfaceAttributes = { type: extensionId, config: {} };
        for (const parameter of parameters) {
            const extensionPromptResult = await inquirer.prompt(Create.prompts.extensionParameters(parameter));
            appManifestInterfaceEntry.config[parameter.id] = extensionPromptResult.extensionParameter;
        }
        return appManifestInterfaceEntry;
    }

    private async _parseFlags(packageIndex: PackageIndex, flags: any): Promise<CreateData> {
        let appManifestInterfaceAttributes: AppManifestInterfaceAttributes[] = [];

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
                    appManifestInterfaceAttributes.push(
                        await Create.createAppManifestInterfaceAttributes(interfaceEntry, interfaceParameters!),
                    );
                }
            }
        }
        const createData: CreateData = new CreateData(flags.core, flags.name, flags.example, appManifestInterfaceAttributes);
        return createData;
    }

    private async _runInteractiveMode(packageIndex: PackageIndex): Promise<CreateData> {
        const corePromptResult = await InteractiveMode.configureCore(packageIndex.getCores());
        const appManifestInterfaceAttributes = await InteractiveMode.configureExtension(packageIndex, corePromptResult);
        const createData: CreateData = new CreateData(
            corePromptResult.chosenCore.id,
            corePromptResult.appName,
            corePromptResult.example,
            appManifestInterfaceAttributes,
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
        await ProjectConfig.create(createData.packages, createData.coreId.split('-').at(-1)!, this.config.version);
        createData.appManifest.write();
        const projectConfig = ProjectConfig.read(this.config.version);
        const coreConfig = projectConfig.packages.find(
            (packageConfig: PackageConfig) => packageConfig.repo === packageIndex.getPackageByComponentId(createData.coreId).package,
        );
        await packageDownloader(coreConfig!).downloadPackage({ checkVersionOnly: false });
        try {
            await Exec.run([createData.coreId, 'create-project', '-d', process.cwd(), '-e', createData.example ? createData.name : '']);
        } catch (error) {
            this.error('Unable to execute create script!');
        }

        this.log(`... Project for Vehicle Application '${createData.name}' created!`);
        await Init.run(['--no-hooks']);
        await Sync.run([]);
    }
}
