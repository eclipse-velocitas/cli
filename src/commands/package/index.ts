// Copyright (c) 2022-2024 Contributors to the Eclipse Foundation
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

import { Args, Command, Flags } from '@oclif/core';
import { PackageConfig } from '../../modules/package';
import { ProjectConfigIO } from '../../modules/projectConfig/projectConfigIO';

export default class Package extends Command {
    static description = 'Prints information about packages';

    static examples = [
        `$ velocitas package devenv-runtimes
            devenv-runtimes:
                version: v3.0.0
                components:
                    - id: runtime-local
                    variables:
                    - runtimeFilePath:
                        type: string
                        description: "Path to the file describing your custom runtime configuration."
                        required: false
                        default: runtime.json
        $ velocitas package --get-path devenv-runtimes
            /home/vscode/.velocitas/packages/devenv-runtimes/v3.0.0`,
    ];

    static flags = {
        getPath: Flags.boolean({ char: 'p', aliases: ['get-path'], description: 'Print the path of the package', required: false }),
    };

    static args = {
        name: Args.string({ description: 'Name of the package', required: false }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Package);

        const projectConfig = ProjectConfigIO.read(`v${this.config.version}`);

        let packagesToPrint: PackageConfig[] = [];

        if (!args.name && flags.getPath) {
            throw new Error('Path can be only printed for a single package, please specify <name>!');
        }

        if (args.name) {
            packagesToPrint.push(projectConfig.getPackages().find((pkgCfg: PackageConfig) => pkgCfg.getPackageName() === args.name)!);

            if (flags.getPath) {
                this.log(packagesToPrint[0].getPackageDirectoryWithVersion());
                return;
            }
        } else {
            packagesToPrint = projectConfig.getPackages();
        }

        for (const packageToPrint of packagesToPrint) {
            const packageManifest = packageToPrint.readPackageManifest();

            this.log(`${packageToPrint.getPackageName()}:`);
            this.log(`${' '.repeat(4)}version: ${packageToPrint.version}`);
            this.log(`${' '.repeat(4)}components:`);
            for (const component of packageManifest.components) {
                this.log(`${' '.repeat(5)} - id: ${component.id}`);
                if (component.variables && component.variables.length > 0) {
                    this.log(`${' '.repeat(8)}variables:`);
                    for (const exposedVariable of component.variables) {
                        this.log(`${' '.repeat(8)}- ${exposedVariable.name}:`);
                        this.log(`${' '.repeat(12)}type: ${exposedVariable.type}`);
                        this.log(`${' '.repeat(12)}description: "${exposedVariable.description}"`);
                        this.log(`${' '.repeat(12)}required: ${exposedVariable.default ? false : true}`);
                        if (exposedVariable.default) {
                            this.log(`${' '.repeat(12)}default: ${exposedVariable.default}`);
                        }
                    }
                }
                if (component.programs && component.programs.length > 0) {
                    this.log(`${' '.repeat(8)}programs:`);
                    for (const exposedProgram of component.programs) {
                        this.log(`${' '.repeat(8)}- id: ${exposedProgram.id}`);
                        if (exposedProgram.description) {
                            this.log(`${' '.repeat(10)}description: ${exposedProgram.description}`);
                        }
                        this.log(`${' '.repeat(10)}executable: ${exposedProgram.executable}`);
                        if (exposedProgram.args && exposedProgram.args.length > 0) {
                            this.log(`${' '.repeat(10)}default-args: ${exposedProgram.args}`);
                        }
                    }
                }
            }
            this.log('');
        }
    }
}
