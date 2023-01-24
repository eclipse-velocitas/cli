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
import { downloadPackageVersion, isPackageInstalled } from '../../modules/package';
import { ProjectConfig } from '../../modules/project-config';

export default class Init extends Command {
    static description = 'Initializes Velocitas Vehicle App';

    static examples = [
        `$ velocitas init
Initializing Velocitas Vehicle App!
Velocitas project found!
... 'devenv-runtime-local:v1.0.11' already initialized.
... 'devenv-runtime-k3d:v1.0.5' already initialized.
... 'devenv-github-workflows:v1.0.1' already initialized.
... 'devenv-github-templates:v1.0.1' already initialized.`,
    ];

    static flags = {
        verbose: Flags.boolean({ char: 'v', aliases: ['verbose'], description: 'Enable verbose logging', required: false }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Init);

        this.log(`Initializing Velocitas packages ...`);
        let config: ProjectConfig;

        if (ProjectConfig.isAvailable()) {
            config = ProjectConfig.read();
            for (const packageConfig of config.packages) {
                if (isPackageInstalled(packageConfig.name, packageConfig.version)) {
                    this.log(`... '${packageConfig.name}:${packageConfig.version}' already initialized.`);
                    continue;
                }
                this.log(`... Downloading package: '${packageConfig.name}:${packageConfig.version}'`);
                await downloadPackageVersion(packageConfig.name, packageConfig.version, flags.verbose);
            }
        } else {
            this.log('... Creating .velocitas.json at the root of your repository.');
            config = new ProjectConfig();
            config.write();
        }
    }
}
