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

const AVAILABLE_LANGUAGES = [
    { name: 'Python', value: 'python' },
    { name: 'C++', value: 'cpp' },
];

const AVAILABLE_PACKAGES = [
    { name: 'devenv-devcontainer-setup', value: 'devenv-devcontainer-setup@latest', checked: true },
    { name: 'devenv-github-templates', value: 'devenv-github-templates@latest', checked: true },
    { name: 'devenv-github-workflows', value: 'devenv-github-workflows@latest', checked: true },
    { name: 'devenv-devcontainer-runtimes', value: 'devenv-runtimes@latest', checked: true },
];

const AVAILABLE_EXAMPLES = [
    { name: 'SeatAdjuster', value: 'SeatAdjuster' },
    { name: 'DogMode', value: 'DogMode' },
    { name: 'none', value: 'none' },
];

const AVAILABLE_INTERFACES = [
    { name: 'Vehicle Signal Interface based on VSS and KUKSA Databroker', value: 'vehicle-signal-interface' },
    { name: 'gRPC service contract based on a proto interface description', value: 'grpc-interface' },
];

export default class Create extends Command {
    static description = 'Create a new Velocitas Vehicle App project.';

    static examples = [
        `$ velocitas create -n VApp -l python ...
        ... Creating a new Velocitas project!`,
    ];

    static flags = {
        name: Flags.string({ char: 'n', description: 'Name of the Vehicle App.', required: false }),
        language: Flags.string({
            char: 'l',
            description: 'Programming language of velocitas framework to use.',
            required: false,
            options: ['python', 'cpp'],
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
            options: ['vehicle-signal-interface', 'grpc-interface'],
        }),
    };

    static promptMessages = {
        name: '> What is the name of your project?',
        language: '> Which programming language would you like to use for your project?',
        package: '> Which packages would you like to use? (multiple selections are possible - all packages are selected by default)',
        example: '> Which example would you like to use?',
        interface: '> Which functional interfaces does your application have?',
    };

    private async _runInteractiveMode(flags: any) {
        flags.name = await ux.prompt(Create.promptMessages.name, { required: true });
        // inquirer >= v9 is an ESM package.
        // We are not using ESM in our CLI,
        // We need to set moduleResolution to node16 in tsconfig.json
        // and import inquirer using "await import"
        // @ts-ignore: declaration file not found
        const { default: inquirer } = await import('inquirer');
        let promptResponses: any = await inquirer.prompt([
            {
                name: 'language',
                prefix: '',
                message: Create.promptMessages.language,
                type: 'list',
                choices: AVAILABLE_LANGUAGES,
            },
            {
                name: 'package',
                prefix: '',
                message: Create.promptMessages.package,
                type: 'checkbox',
                choices: AVAILABLE_PACKAGES,
            },
            {
                name: 'example',
                prefix: '',
                message: Create.promptMessages.example,
                type: 'list',
                choices: AVAILABLE_EXAMPLES,
            },
            {
                name: 'interface',
                prefix: '',
                message: Create.promptMessages.interface,
                type: 'checkbox',
                choices: AVAILABLE_INTERFACES,
            },
        ]);
        flags.language = promptResponses.language;
        flags.package = promptResponses.package;
        flags.example = promptResponses.example;
        flags.interface = promptResponses.interface;
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(Create);

        this.log(`... Creating a new Velocitas project!`);
        this.log(JSON.stringify(flags));

        if (Object.keys(flags).length <= 1) {
            this.log('Interactive project creation started');
            await this._runInteractiveMode(flags);
        }

        if (!flags.name) {
            throw new Error("Missing required flag 'name'");
        }
        if (!flags.language) {
            throw new Error("Missing required flag 'language'");
        }
        if (!flags.package) {
            flags.package = [
                'devenv-devcontainer-setup@latest',
                'devenv-github-templates@latest',
                'devenv-github-workflows@latest',
                'devenv-runtimes@latest',
            ];
        }
        // this.log(JSON.stringify(flags));
        this.log(`... Project for Vehicle Application '${flags.name}' created!`);
    }
}
