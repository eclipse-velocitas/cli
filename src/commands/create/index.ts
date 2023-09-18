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

import { ux, Command, Flags } from '@oclif/core';
import { ProjectConfig } from '../../modules/project-config';
import { PackageConfig } from '../../modules/package';
import { getLatestVersion } from '../../modules/semver';
import { sdkDownloader } from '../../modules/package-downloader';
import { SdkConfig } from '../../modules/sdk';
import { awaitSpawn } from '../../modules/exec';
import { outputFileSync } from 'fs-extra';
import { posix as pathPosix } from 'path';
import Init from '../init';
import Sync from '../sync';
import { ExampleDescription, FunctionalInterfaceDescription, PackageIndex } from '../../modules/package-index';

let AVAILABLE_LANGUAGES: string[] = [];
let AVAILABLE_EXAMPLES: ExampleDescription[] = [];
let AVAILABLE_INTERFACES: FunctionalInterfaceDescription[] = [];

const DEFAULT_APP_MANIFEST_PATH = './app/AppManifest.json';
interface AppManifestInterfaces {
    interfaces: AppManifestInterfaceEntry[];
}
interface AppManifestInterfaceEntry {
    type: string;
    config: {
        [key: string]: any;
    };
}

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
            description: 'Programming language of velocitas framework to use.',
            required: false,
        }),
        example: Flags.string({
            char: 'e',
            description: 'Use an example on which the Vehicle App will be generated.',
            required: false,
        }),
        interface: Flags.string({
            char: 'i',
            description: 'Functional interface your Vehicle App should use.',
            required: false,
        }),
    };

    static promptMessages = {
        name: '> What is the name of your project?',
        language: '> Which programming language would you like to use for your project?',
        exampleQuestion: '> Would you like to use a provided example?',
        exampleUse: '> Which provided example would you like to use?',
        interface: '> Which functional interfaces does your application have?',
    };

    appManifestInterfaces: AppManifestInterfaces = { interfaces: [] };

    private async _runInteractiveMode(flags: any) {
        flags.name = await ux.prompt(Create.promptMessages.name, { required: true });
        // inquirer >= v9 is an ESM package.
        // We are not using ESM in our CLI,
        // We need to set moduleResolution to node16 in tsconfig.json
        // and import inquirer using "await import"
        // @ts-ignore: declaration file not found
        const { default: inquirer } = await import('inquirer');
        let interactiveResponses: any = await inquirer.prompt([
            {
                name: 'language',
                prefix: '',
                message: Create.promptMessages.language,
                type: 'list',
                choices: AVAILABLE_LANGUAGES,
            },
            {
                name: 'exampleQuestion',
                prefix: '',
                message: Create.promptMessages.exampleQuestion,
                type: 'confirm',
            },
        ]);

        flags.language = interactiveResponses.language;
        flags.example = interactiveResponses.exampleQuestion;

        if (flags.example) {
            AVAILABLE_EXAMPLES = AVAILABLE_EXAMPLES.filter((examples: ExampleDescription) => examples.language === flags.language);
            interactiveResponses = await inquirer.prompt([
                {
                    name: 'exampleUse',
                    prefix: '',
                    message: Create.promptMessages.exampleUse,
                    type: 'list',
                    choices: AVAILABLE_EXAMPLES,
                },
            ]);
        } else {
            interactiveResponses = await inquirer.prompt([
                {
                    name: 'interface',
                    prefix: '',
                    message: Create.promptMessages.interface,
                    type: 'checkbox',
                    choices: AVAILABLE_INTERFACES,
                },
            ]);
        }

        flags.example = interactiveResponses.exampleUse;
        flags.interface = interactiveResponses.interface;

        if (flags.interface && flags.interface.length > 0) {
            await this._handleAdditionalInterfaceArgs(flags.interface, inquirer);
        }
    }

    private async _handleAdditionalInterfaceArgs(interfaces: string[], inquirer: any) {
        for (const interfaceEntry of interfaces) {
            const appManifestInterfaceEntry: AppManifestInterfaceEntry = { type: interfaceEntry, config: {} };
            const interfaceObject = AVAILABLE_INTERFACES.find(
                (availableInterface: FunctionalInterfaceDescription) => availableInterface.value === interfaceEntry,
            );
            if (interfaceObject) {
                for (const arg of interfaceObject.args) {
                    let interfaceArgResponse: any = {};
                    if (arg.required) {
                        interfaceArgResponse = await inquirer.prompt([
                            {
                                name: arg.id,
                                prefix: '',
                                message: `Config '${arg.id}' for interface '${interfaceEntry}': ${arg.description}`,
                                type: 'input',
                            },
                        ]);
                        appManifestInterfaceEntry.config[arg.id] = interfaceArgResponse[arg.id];
                    } else {
                        interfaceArgResponse[arg.id] = '';
                    }
                    if (!interfaceArgResponse[arg.id]) {
                        appManifestInterfaceEntry.config[arg.id] = arg.default;
                        if (arg.type === 'object') {
                            appManifestInterfaceEntry.config[arg.id] = JSON.parse(arg.default);
                        }
                    }
                }
            }

            this.appManifestInterfaces.interfaces.push(appManifestInterfaceEntry);
        }
    }

    private async _createPackageConfig(packageIndex: PackageIndex, language: string) {
        const packageIndexExtensions = packageIndex.getExtensions();
        const projectConfig = new ProjectConfig();
        for (const extension of packageIndexExtensions) {
            const packageConfig = new PackageConfig({ name: extension.package });
            const versions = await packageConfig.getPackageVersions();
            const latestVersion = getLatestVersion(versions);

            packageConfig.repo = extension.package;
            packageConfig.version = latestVersion;
            projectConfig.packages.push(packageConfig);
        }
        projectConfig.variables.set('language', language);
        projectConfig.variables.set('repoType', 'app');
        projectConfig.variables.set('appManifestPath', DEFAULT_APP_MANIFEST_PATH);
        projectConfig.variables.set('githubRepoId', '<myrepo>');
        projectConfig.cliVersion = this.config.version;
        projectConfig.write();
    }

    private _handlePackageIndex(packageIndex: PackageIndex) {
        AVAILABLE_LANGUAGES = packageIndex.getAvailableLanguages();
        AVAILABLE_EXAMPLES = packageIndex.getAvailableExamples();
        AVAILABLE_INTERFACES = packageIndex.getAvailableInterfaces();
        Create.flags.language.options = AVAILABLE_LANGUAGES.map((languageEntry: string) => {
            return languageEntry;
        });
        Create.flags.interface.options = AVAILABLE_INTERFACES.map((interfaceEntry: FunctionalInterfaceDescription) => {
            return interfaceEntry.value;
        });
    }

    private async _createAppManifestV3(name: string, interfaces: AppManifestInterfaces) {
        const appManifest = { manifestVersion: 'v3', name: name, ...interfaces };
        outputFileSync(DEFAULT_APP_MANIFEST_PATH, JSON.stringify(appManifest, null, 4));
    }

    private async _setDefaultAppManifestInterfaceConfig() {
        for (const interfaceEntry of AVAILABLE_INTERFACES) {
            if (interfaceEntry.default) {
                const defaultAppManifestInterfaceConfig: AppManifestInterfaceEntry = { type: interfaceEntry.value, config: {} };
                for (const arg of interfaceEntry.args) {
                    defaultAppManifestInterfaceConfig.config[arg.id] = arg.default;
                    if (arg.type === 'object') {
                        defaultAppManifestInterfaceConfig.config[arg.id] = JSON.parse(arg.default);
                    }
                }
                this.appManifestInterfaces.interfaces.push(defaultAppManifestInterfaceConfig);
            }
        }
    }

    async run(): Promise<void> {
        const packageIndex = PackageIndex.read();
        this._handlePackageIndex(packageIndex);
        const { flags } = await this.parse(Create);
        this.log(`Creating a new Velocitas project ...`);

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
        if (!flags.example && !flags.interface) {
            this._setDefaultAppManifestInterfaceConfig();
        }

        await this._createPackageConfig(packageIndex, flags.language);
        await this._createAppManifestV3(flags.name, this.appManifestInterfaces);
        const sdkConfig = new SdkConfig(flags.language);
        await sdkDownloader(sdkConfig).downloadPackage({ checkVersionOnly: false });
        const scriptPath = pathPosix.join(sdkConfig.getPackageDirectory(), 'latest', '.project-creation', 'run.py');
        await awaitSpawn(
            `python3`,
            [scriptPath, '-d', process.cwd(), '-e', flags.example ? flags.example : ''],
            process.cwd(),
            process.env,
            true,
        );

        this.log(`... Project for Vehicle Application '${flags.name}' created!`);
        await Init.run(['-s']);
        await Sync.run([]);
    }
}
