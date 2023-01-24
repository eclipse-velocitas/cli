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

import { CliUx, Command, Flags } from '@oclif/core';
import { downloadPackageVersion, getPackageVersions, isPackageInstalled } from '../../modules/package';
import { ProjectConfig } from '../../modules/project-config';
import { getLatestVersion } from '../../modules/semver';

export default class Upgrade extends Command {
    static description = 'Updates Velocitas components.';

    static examples = [
        `$ velocitas upgrade
Checking for updates!
... 'devenv-runtime-local' is up to date!
... 'devenv-runtime-k3d' is up to date!
... 'devenv-github-workflows' is up to date!
... 'devenv-github-templates' is up to date!`,
    ];

    static flags = {
        'dry-run': Flags.boolean({ description: 'Check which packages can be upgraded', required: false }),
        verbose: Flags.boolean({ char: 'v', aliases: ['verbose'], description: 'Start the verbose logging', required: false }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Upgrade);

        this.log(`Checking for updates!`);
        const projectConfig = ProjectConfig.read();
        for (const packageConfig of projectConfig.packages) {
            const availableVersions = await getPackageVersions(packageConfig.name);
            try {
                const latestVersion = getLatestVersion(availableVersions.flatMap((v) => v.name));

                if (packageConfig.version === latestVersion) {
                    if (!isPackageInstalled(packageConfig.name, packageConfig.version)) {
                        this.log(`... No installed sources for ${packageConfig.name}:${packageConfig.version} found`);
                        if (flags['dry-run']) {
                            continue;
                        }
                        const response = await CliUx.ux.prompt(`... Do you want to download them? [y/n]`, { default: 'y' });
                        if (response === 'y') {
                            await downloadPackageVersion(packageConfig.name, latestVersion, flags.verbose);
                        }
                        continue;
                    }
                    this.log(`... '${packageConfig.name}' is up to date!`);
                    continue;
                }

                this.log(`... '${packageConfig.name}' is currently at ${packageConfig.version}, can be updated to ${latestVersion}`);
                if (flags['dry-run']) {
                    continue;
                }
                const response = await CliUx.ux.prompt(`... Do you wish to continue? [y/n]`, { default: 'y' });
                if (response === 'y') {
                    await downloadPackageVersion(packageConfig.name, latestVersion, flags.verbose);
                    packageConfig.version = latestVersion;
                    projectConfig.write();
                }
            } catch (e) {
                throw new Error(`Error during upgrade: '${e}'`);
            }
        }
    }
}
