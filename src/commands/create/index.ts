// Copyright (c) 2023 Contributors to the Eclipse Foundation
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
import { Parameter, ExampleDescription, FunctionalInterfaceDescription, PackageIndex, ExposedInterface } from '../../modules/package-index';
import { AppManifestInterfaceEntry, AppManifestInterfaces, createAppManifest } from '../../modules/app-manifest';

// inquirer >= v9 is an ESM package.
// We are not using ESM in our CLI,
// We need to set moduleResolution to node16 in tsconfig.json
// and import inquirer using "await import"
// @ts-ignore: declaration file not found
const inquirer = require('inquirer');

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
    /*
    static prompts = {
        name: {
            name: 'name',
            prefix: '',
            message: '> What is the name of your project?',
            type: 'input',
        },
        language: {
            name: 'language',
            prefix: '',
            message: '> Which programming language would you like to use for your project?',
            type: 'list',
            choices: () => availableLanguages,
        },
        exampleQuestion: {
            name: 'exampleQuestion',
            prefix: '',
            message: '> Would you like to use a provided example?',
            type: 'confirm',
        },
        exampleUse: {
            name: 'exampleUse',
            prefix: '',
            message: '> Which provided example would you like to use?',
            type: 'list',
            choices: () => availableExamples,
        },
        interface: {
            name: 'interface',
            prefix: '',
            message: '> Which functional interfaces does your application have?',
            type: 'checkbox',
            choices: () => availableInterfaces,
        },
        additionalArg: (arg: Parameter, interfaceEntry: string) => {
            return {
                name: arg.id,
                prefix: '',
                message: `Config '${arg.id}' for interface '${interfaceEntry}': ${arg.description}`,
                default: arg.default,
                validate: (input: any) => {
                    if (!input) {
                        console.log('No empty value allowed for required argument!');
                        return false;
                    } else {
                        return true;
                    }
                },
                type: 'input',
            };
        },
    };
    */

    appManifestInterfaces: AppManifestInterfaces = { interfaces: [] };

    private async _runInteractiveMode(packageIndex: PackageIndex, flags: any) {
        const availableCores = packageIndex.getCores();
        let promptResult = await inquirer.prompt({
            name: 'core',
            prefix: '>',
            message: 'What kind of project would you like to create?',
            type: 'list',
            choices: () => availableCores.map((x) => ({ name: x.name, value: x })),
        });

        const chosenCore = promptResult.core as ExposedInterface;

        const sets = chosenCore.parameterSets;
        if (sets !== undefined) {
            let chosenParamSetId = 0;
            if (sets.length > 0) {
                promptResult = await inquirer.prompt({
                    name: 'set',
                    prefix: '>',
                    message: 'Which flavor?',
                    type: 'list',
                    choices: () => sets.map((x) => ({ name: x.name, value: sets.indexOf(x) })),
                });

                chosenParamSetId = promptResult.set;
            }

            for (const parameter of sets[chosenParamSetId].parameters) {
                promptResult = await inquirer.prompt({
                    name: 'parameter',
                    prefix: '>',
                    message: parameter.description,
                    default: parameter.default,
                    type: parameter.type,
                });
            }
        }

        const availableExtensions = packageIndex.getExtensions().filter((ext) => ext.compatibleCores.find((x) => x === chosenCore.id));

        if (availableExtensions.length === 0) {
            return;
        }

        promptResult = await inquirer.prompt({
            name: 'extensions',
            prefix: '>',
            message: 'Which extensions do you want to use?',
            type: 'checkbox',
            choices: () => availableExtensions.map((ext) => ({ name: ext.name, value: ext })),
        });

        for (const selectedExtension of promptResult.extensions) {
            const typedExtension = selectedExtension as ExposedInterface;

            this.log(`Configure extension '${typedExtension.name}'`);

            for (const parameter of typedExtension.parameters!) {
                promptResult = await inquirer.prompt({
                    name: 'parameter',
                    prefix: '>',
                    message: parameter.description,
                    default: parameter.default,
                    type: parameter.type,
                });
            }
        }
    }

    /*
    private async _queryArgsForInterface(arg: Parameter, interfaceEntry: string): Promise<any> {
        let interfaceArgResponse: any = {};
        let config: any = {};
        if (arg.required) {
            interfaceArgResponse = await inquirer.prompt([Create.prompts.additionalArg(arg, interfaceEntry)]);
            config[arg.id] = interfaceArgResponse[arg.id];
        } else {
            interfaceArgResponse[arg.id] = '';
        }
        if (!interfaceArgResponse[arg.id] && arg.default) {
            config[arg.id] = arg.default;
            if (arg.type === 'object') {
                config[arg.id] = JSON.parse(arg.default);
            }
        }
        return config;
    }
    */

    /*
    private async _handleAdditionalInterfaceArgs(interfaces: string[]) {
        for (const interfaceEntry of interfaces) {
            const appManifestInterfaceEntry: AppManifestInterfaceEntry = { type: interfaceEntry, config: {} };
            const interfaceObject = availableInterfaces.find(
                (availableInterface: FunctionalInterfaceDescription) => availableInterface.value === interfaceEntry,
            );
            for (const arg of interfaceObject!.args) {
                const interfaceConfig = await this._queryArgsForInterface(arg, interfaceEntry);
                appManifestInterfaceEntry.config = { ...appManifestInterfaceEntry.config, ...interfaceConfig };
            }
            this.appManifestInterfaces.interfaces.push(appManifestInterfaceEntry);
        }
    }
    */

    private _loadDataFromPackageIndex(packageIndex: PackageIndex) {
        Create.flags.core.options = packageIndex.getCores().map((core: ExposedInterface) => {
            return core.id;
        });
        Create.flags.interface.options = packageIndex.getExtensions().map((ext: ExposedInterface) => {
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
        const packageIndex = PackageIndex.read();
        this._loadDataFromPackageIndex(packageIndex);

        const { flags } = await this.parse(Create);
        this.log(`Creating a new Velocitas project ...`);

        if (flags.name && flags.example) {
            throw new Error("Flags 'name' and 'example' are mutually exclusive!");
        }

        if (flags.example) {
            flags.name = flags.example;
        }

        if (Object.keys(flags).length === 0) {
            this.log('Interactive project creation started');
            await this._runInteractiveMode(packageIndex, flags);
        }

        if (!flags.name) {
            throw new Error("Missing required flag 'name'");
        }
        if (!flags.language) {
            throw new Error("Missing required flag 'language'");
        }

        if (!flags.example && flags.interface) {
            // if (this.appManifestInterfaces.interfaces.length === 0 && flags.interface.length > 0) {
            //     await this._handleAdditionalInterfaceArgs(flags.interface);
            // }
        }

        await ProjectConfig.create([], flags.language, this.config.version);
        await createAppManifest(flags.name, this.appManifestInterfaces);
        const sdkConfig = new SdkConfig(flags.language);
        await sdkDownloader(sdkConfig).downloadPackage({ checkVersionOnly: false });

        const result = await awaitSpawn(
            `python3`,
            [this._getScriptExecutionPath(sdkConfig), '-d', process.cwd(), '-e', flags.example ? flags.example : ''],
            process.cwd(),
            process.env,
            true,
        );

        if (result === null || result.exitCode !== 0) {
            this.error('Unable to execute create script!');
        }

        this.log(`... Project for Vehicle Application '${flags.name}' created!`);
        await Init.run(['--no-hooks']);
        await Sync.run([]);
    }
}
