// Copyright (c) 2022 Robert Bosch GmbH
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

import { Command, Flags, Args } from '@oclif/core';
import { join } from 'node:path';
import { PackageConfig } from '../../modules/package';
import { ProjectConfig } from '../../modules/project-config';

export default class Package extends Command {
    static description = 'Prints information about packages';

    static examples = [
        `$ velocitas package devenv-runtime-local
devenv-runtime-local
    version: v1.0.12
    components:
          - id: runtime-local
            type: runtime
            variables:
                    name: myVar
                    type: string
                    description: some basic description
                    required: false

$ velocitas component --get-path devenv-runtime-local
/home/vscode/.velocitas/packages/devenv-runtime-local/v1.0.12
`,
    ];

    static flags = {
        getPath: Flags.boolean({ char: 'p', aliases: ['get-path'], description: 'Print the path of the package', required: false }),
    };

    static args = {
        name: Args.string({ description: 'Name of the package', required: false }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Package);

        const projectConfig = ProjectConfig.read(`v${this.config.version}`);

        let packagesToPrint: Array<PackageConfig>;

        if (!args.name && flags.getPath) {
            throw new Error('Path can be only printed for a single package, please specify <name>!');
        }

        if (args.name) {
            packagesToPrint = new Array<PackageConfig>();
            packagesToPrint.push(projectConfig.packages.find((p) => p.getPackageName() === args.name)!);

            const componentDir = join(packagesToPrint[0].getPackageDirectory(), packagesToPrint[0].version);

            if (flags.getPath) {
                this.log(componentDir);
                return;
            }
        } else {
            packagesToPrint = projectConfig.packages;
        }

        for (const packageToPrint of packagesToPrint) {
            const packageManifest = packageToPrint.readPackageManifest();

            this.log(`${packageToPrint.getPackageName()}:`);
            this.log(`${' '.repeat(4)}version: ${packageToPrint.version}`);
            this.log(`${' '.repeat(4)}components:`);
            for (const component of packageManifest.components) {
                this.log(`${' '.repeat(5)} - id: ${component.id}`);
                this.log(`${' '.repeat(8)}type: ${component.type}`);
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
