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

import { Command, Flags } from '@oclif/core';
import { PackageConfig } from '../../modules/package';
import { ProjectConfig, ProjectConfigLock } from '../../modules/project-config';
import { getLatestVersion, getMatchedVersion, incrementVersionRange } from '../../modules/semver';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Init from '../init';

export default class Upgrade extends Command {
    static description = 'Updates Velocitas components.';

    static examples = [
        `$ velocitas upgrade
        Checking .velocitas.json for updates!
        ... pkg-velocitas-main:vx.x.x → up to date!
        ... devenv-devcontainer-setup:vx.x.x → up to date!
        ... devenv-runtimes:vx.x.x → vx.x.x
        ... devenv-github-templates:vx.x.x → up to date!
        ... devenv-github-workflows:vx.x.x → up to date!`,
    ];

    static flags = {
        'dry-run': Flags.boolean({ description: 'Check which packages can be upgraded', required: false }),
        'ignore-bounds': Flags.boolean({ description: 'Ignores specified version ranges', required: false }),
        init: Flags.boolean({ description: 'Init after upgrade check', required: false }),
        verbose: Flags.boolean({ char: 'v', aliases: ['verbose'], description: 'Enable verbose logging', required: false, default: false }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Upgrade);
        const projectConfigLock = ProjectConfigLock.read();

        if (!projectConfigLock) {
            throw new Error(`No .velocitas-lock.json found. Please 'velocitas init' first!`);
        }
        this.log(`Checking .velocitas.json for updates!`);
        const projectConfig = ProjectConfig.read(`v${this.config.version}`, undefined, true);

        let updateCheck: boolean = false;
        try {
            for (const packageConfig of projectConfig.getPackages()) {
                const updateAvailable = await this.checkUpdate(packageConfig, projectConfig, projectConfigLock, flags);
                if (updateAvailable) {
                    updateCheck = true;
                }
            }
            if (updateCheck && !flags.init) {
                this.log("Update available: Call 'velocitas init'");
            }
        } catch (error) {
            this.error(`Error during upgrade: '${error}'`);
        }
        if (flags.init && updateCheck) {
            const commandArgs = flags.verbose ? ['-v'] : [];
            await Init.run(commandArgs);
        }
    }

    async checkUpdate(
        packageConfig: PackageConfig,
        projectConfig: ProjectConfig,
        projectConfigLock: ProjectConfigLock,
        flags: any,
    ): Promise<boolean> {
        const initialVersionSpecifier = packageConfig.version;
        const availableVersions = await packageConfig.getPackageVersions();
        const matchedVersion = flags['ignore-bounds']
            ? getLatestVersion(availableVersions.all)
            : getMatchedVersion(availableVersions, packageConfig.version);

        const lockedVersion = projectConfigLock.findVersion(packageConfig.repo);

        if (lockedVersion === matchedVersion) {
            this.log(`... ${packageConfig.getPackageName()}:${lockedVersion} → up to date!`);
            return false;
        } else {
            this.log(`... ${packageConfig.getPackageName()}:${lockedVersion} → ${matchedVersion}`);
            if (flags['dry-run']) {
                return false;
            }
            packageConfig.setPackageVersion(incrementVersionRange(initialVersionSpecifier, matchedVersion));
            projectConfig.write();
            return true;
        }
    }
}
