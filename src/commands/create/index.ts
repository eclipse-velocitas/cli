// Copyright (c) 2023 Robert Bosch GmbH
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
import Init from '../init';
import Sync from '../sync';
import { Argument, ExampleDescription, FunctionalInterfaceDescription, PackageIndex } from '../../modules/package-index';
import { AppManifestInterfaceEntry, AppManifestInterfaces, createAppManifest } from '../../modules/app-manifest';

// inquirer >= v9 is an ESM package.
// We are not using ESM in our CLI,
// We need to set moduleResolution to node16 in tsconfig.json
// and import inquirer using "await import"
// @ts-ignore: declaration file not found
const inquirer = require('inquirer');

let availableLanguages: string[] = [];
let availableExamples: ExampleDescription[] = [];
let availableInterfaces: FunctionalInterfaceDescription[] = [];

export default class Create extends Command {
    static description = 'Create a new Velocitas Vehicle App project.';

    static examples = [
        `$ velocitas create -n VApp -l python ...
        Creating a new Velocitas project ...`,
    ];

    static flags = {
        name: Flags.string({ char: 'n', description: 'Name of the Vehicle App.', required: false }),
        language: Flags.string({
            char: 'l',
            description: 'Programming language used for the Vehicle App (python, cpp).',
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
        additionalArg: (arg: Argument, interfaceEntry: string) => {
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

    appManifestInterfaces: AppManifestInterfaces = { interfaces: [] };

    private _filterAvailableExamplesByLanguage(language: string) {
        const filteredExamples = availableExamples.filter((example) => example.language === language);
        if (!filteredExamples.length) {
            throw new Error(`No example for your chosen language '${language}' available`);
        }
        return filteredExamples;
    }

    private async _runInteractiveMode(flags: any) {
        const interactiveResponses: any = await inquirer.prompt([Create.prompts.language, Create.prompts.exampleQuestion]);

        flags.language = interactiveResponses.language;
        flags.example = interactiveResponses.exampleQuestion;

        if (flags.example) {
            availableExamples = this._filterAvailableExamplesByLanguage(flags.language);
            const exampleResponse = await inquirer.prompt([Create.prompts.exampleUse]);
            flags.example = flags.name = exampleResponse.exampleUse;
        } else {
            const interactiveSkeletonAppResponses: any = await inquirer.prompt([Create.prompts.name, Create.prompts.interface]);
            flags.name = interactiveSkeletonAppResponses.name;
            flags.interface = interactiveSkeletonAppResponses.interface;

            if (flags.interface && flags.interface.length > 0) {
                await this._handleAdditionalInterfaceArgs(flags.interface);
            }
        }
    }

    private async _queryArgsForInterface(arg: Argument, interfaceEntry: string): Promise<any> {
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

    private _loadDataFromPackageIndex(packageIndex: PackageIndex) {
        availableLanguages = packageIndex.getAvailableLanguages();
        availableExamples = packageIndex.getAvailableExamples();
        availableInterfaces = packageIndex.getAvailableInterfaces();
        Create.flags.language.options = availableLanguages.map((languageEntry: string) => {
            return languageEntry;
        });
        Create.flags.interface.options = availableInterfaces.map((interfaceEntry: FunctionalInterfaceDescription) => {
            return interfaceEntry.value;
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
            await this._runInteractiveMode(flags);
        }

        if (!flags.name) {
            throw new Error("Missing required flag 'name'");
        }
        if (!flags.language) {
            throw new Error("Missing required flag 'language'");
        }

        if (!flags.example && flags.interface) {
            if (this.appManifestInterfaces.interfaces.length === 0 && flags.interface.length > 0) {
                await this._handleAdditionalInterfaceArgs(flags.interface);
            }
        }

        await ProjectConfig.create(packageIndex.getExtensions(), flags.language, this.config.version);
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
