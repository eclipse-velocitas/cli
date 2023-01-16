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

import { Command, Flags } from '@oclif/core';
import { PackageConfig, ProjectConfig } from '../../modules/project-config';
import { getPackageDirectory, readPackageManifest } from '../../modules/package';

import { join } from 'node:path';

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

    static args = [{ name: 'name', description: 'Name of the package', required: false }];

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Package);

        const projectConfig = ProjectConfig.read();

        let packagesToPrint: Array<PackageConfig>;

        if (!args.name && flags.getPath) {
            throw new Error('Path can be only printed for a single package, please specify <name>!');
        }

        if (args.name) {
            packagesToPrint = new Array<PackageConfig>();
            packagesToPrint.push(projectConfig.packages.find((p) => p.name === args.name)!);

            const componentDir = join(getPackageDirectory(packagesToPrint[0].name), packagesToPrint[0].version);

            if (flags.getPath) {
                this.log(componentDir);
                return;
            }
        } else {
            packagesToPrint = projectConfig.packages;
        }

        for (const packageToPrint of packagesToPrint) {
            const packageManifest = readPackageManifest(packageToPrint);

            this.log(`${packageToPrint.name}`);
            this.log(`${' '.repeat(4)}version: ${packageToPrint.version}`);
            this.log(`${' '.repeat(4)}components:`);
            for (const component of packageManifest.components) {
                this.log(`${' '.repeat(5)} - id: ${component.id}`);
                this.log(`${' '.repeat(8)}type: ${component.type}`);
                if (component.variables && component.variables.length > 0) {
                    this.log(`${' '.repeat(8)}variables:`);
                    for (const exposedVariable of component.variables) {
                        this.log(`${' '.repeat(12)}${exposedVariable.name}`);
                        this.log(`${' '.repeat(16)}type: ${exposedVariable.type}`);
                        this.log(`${' '.repeat(16)}description: ${exposedVariable.description}`);
                        this.log(`${' '.repeat(16)}required: ${exposedVariable.required ? exposedVariable.required : false}`);
                    }
                }
            }
            this.log('');
        }
    }
}
