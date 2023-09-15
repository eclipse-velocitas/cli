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
import { PackageIndex, ComponentEntry } from '../../modules/package-index';

let AVAILABLE_CORES: any[] = [];
let AVAILABLE_PACKAGES: any[] = [];
let AVAILABLE_EXAMPLES: any[] = [];
let AVAILABLE_INTERFACES: any[] = [];

const DEFAULT_APP_MANIFEST_PATH = './app/AppManifest.json';

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
            description: 'Core Velocitas package to use.',
            required: false,
        }),
        template: Flags.boolean({
            char: 't',
            description: 'Default value `false`. Enable content required to generate a template.',
            required: false,
            default: false,
        }),
        package: Flags.string({
            char: 'p',
            description: 'Packages to install. Default all packages are installed.',
            multiple: true,
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
        core: '> Which core do you want to base your project on?',
        exampleQuestion: '> Would you like to use a provided example?',
        exampleUse: '> Which provided example would you like to use?',
        interface: '> Which functional interfaces does your application have?',
    };

    appManifestInterfaces: any = { interfaces: [] };

    private async _runInteractiveMode(packageIndex: PackageIndex, flags: any) {
        flags.name = await ux.prompt(Create.promptMessages.name, { required: true });
        // inquirer >= v9 is an ESM package.
        // We are not using ESM in our CLI,
        // We need to set moduleResolution to node16 in tsconfig.json
        // and import inquirer using "await import"
        // @ts-ignore: declaration file not found
        const { default: inquirer } = await import('inquirer');
        let interactiveResponses: any = await inquirer.prompt([
            {
                name: 'core',
                prefix: '',
                message: Create.promptMessages.core,
                type: 'list',
                choices: AVAILABLE_CORES,
            },
        ]);

        flags.core = interactiveResponses.core;

        const chosenCore: ComponentEntry = interactiveResponses.core;

        const supportedExtensions = packageIndex
            .getExtensions()
            .filter((component) => component.supportedCores!.find((item) => item === chosenCore.id) !== undefined);

        if (chosenCore.parameters.length > 0) {
            for (const parameter of chosenCore.parameters) {
                if (parameter.type === 'choice') {
                    const inquirerType = 'list';
                    await inquirer.prompt([
                        {
                            name: 'parameter',
                            prefix: '',
                            message: parameter.prompt,
                            type: inquirerType,
                            choices: (parameter as any).values,
                        },
                    ]);
                }
            }
        }

        const extensionsPrompt = await inquirer.prompt([
            {
                name: 'parameter',
                prefix: '',
                message: 'Chose extensions for your core',
                type: 'list',
                choices: supportedExtensions.map((ext) => ({ name: ext.description, value: ext })),
            },
        ]);

        for (const extension of extensionsPrompt.parameter) {
            for (const parameter of extension.parameters) {
                if (parameter.type === 'choice') {
                    const inquirerType = 'list';
                    await inquirer.prompt([
                        {
                            name: 'parameter',
                            prefix: '',
                            message: parameter.prompt,
                            type: inquirerType,
                            choices: (parameter as any).values,
                        },
                    ]);
                } else if (parameter.type === 'string') {
                    const inquirerType = 'input';
                    await inquirer.prompt([
                        {
                            name: 'parameter',
                            prefix: '',
                            message: parameter.prompt,
                            type: inquirerType,
                            choices: (parameter as any).values,
                        },
                    ]);
                }
            }
        }

        flags.example = interactiveResponses.exampleUse;
        flags.interface = interactiveResponses.interface;

        if (flags.interface && flags.interface.length > 0) {
            await this._handleAdditionalInterfaceArgs(flags.interface, inquirer);
        }
    }

    private async _handleAdditionalInterfaceArgs(interfaces: any, inquirer: any) {
        for (const interfaceEntry of interfaces) {
            const additionalInterfacePromptResponses: any = { type: interfaceEntry, config: {} };
            const interfaceObject = AVAILABLE_INTERFACES.find((availableInterface: any) => availableInterface.value === interfaceEntry);

            for (const arg of interfaceObject.args) {
                let interfaceArgResponse: any = {};
                if (arg.required) {
                    interfaceArgResponse = await inquirer.prompt([
                        {
                            name: arg.name,
                            prefix: '',
                            message: `Config '${arg.name}' for interface '${interfaceEntry}': ${arg.description}`,
                            type: 'input',
                        },
                    ]);
                    additionalInterfacePromptResponses.config[arg.name] = interfaceArgResponse[arg.name];
                } else {
                    interfaceArgResponse[arg.name] = '';
                }
                if (!interfaceArgResponse[arg.name]) {
                    additionalInterfacePromptResponses.config[arg.name] = arg.default;
                    if (arg.type === 'object') {
                        additionalInterfacePromptResponses.config[arg.name] = JSON.parse(arg.default);
                    }
                }
            }
            this.appManifestInterfaces.interfaces.push(additionalInterfacePromptResponses);
        }
    }

    private async _createPackageConfig(createConfig: any) {
        const projectConfig = new ProjectConfig();
        for (const packageName of createConfig.package) {
            const packageConfig = new PackageConfig({ name: packageName });
            const versions = await packageConfig.getPackageVersions();
            const latestVersion = getLatestVersion(versions);

            packageConfig.repo = packageName;
            packageConfig.version = latestVersion;
            projectConfig.packages.push(packageConfig);
        }
        projectConfig.variables.set('language', createConfig.language);
        projectConfig.variables.set('repoType', 'app');
        projectConfig.variables.set('appManifestPath', DEFAULT_APP_MANIFEST_PATH);
        projectConfig.variables.set('githubRepoId', '<myrepo>');
        projectConfig.cliVersion = this.config.version;
        projectConfig.write();
    }

    private _handlePackageIndex(): PackageIndex {
        const packageIndex = PackageIndex.read();
        AVAILABLE_CORES = packageIndex.getCores().map((comp) => ({
            name: comp.description,
            value: comp,
        }));
        return packageIndex;
    }

    private async _createAppManifestV3(name: string, interfaces: any) {
        const appManifest = { manifestVersion: 'v3', name: name, ...interfaces };
        outputFileSync(DEFAULT_APP_MANIFEST_PATH, JSON.stringify(appManifest, null, 4));
    }

    private async _setDefaultAppManifestInterfaceConfig() {
        for (const interfaceEntry of AVAILABLE_INTERFACES) {
            if (interfaceEntry.default) {
                const defaultAppManifestInterfaceConfig: any = { type: interfaceEntry.value, config: {} };
                for (const arg of interfaceEntry.args) {
                    defaultAppManifestInterfaceConfig.config[arg.name] = arg.default;
                    if (arg.type === 'object') {
                        defaultAppManifestInterfaceConfig.config[arg.name] = JSON.parse(arg.default);
                    }
                }
                this.appManifestInterfaces.interfaces.push(defaultAppManifestInterfaceConfig);
            }
        }
    }

    async run(): Promise<void> {
        const packageIndex = this._handlePackageIndex();

        const { flags } = await this.parse(Create);
        this.log(`Creating a new Velocitas project ...`);

        // because 'template' is default false
        if (Object.keys(flags).length <= 1) {
            this.log('Interactive project creation started');
            await this._runInteractiveMode(packageIndex, flags);
        }

        if (!flags.name) {
            throw new Error("Missing required flag 'name'");
        }
        if (!flags.language) {
            throw new Error("Missing required flag 'language'");
        }
        if (!flags.package) {
            flags.package = AVAILABLE_PACKAGES.map((packages: any) => {
                return packages.name;
            });
        }
        if (!flags.example && !flags.interface) {
            this._setDefaultAppManifestInterfaceConfig();
        }
        await this._createPackageConfig(flags);
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