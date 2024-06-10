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
import { ProjectConfig } from '../../modules/projectConfig/projectConfig';
import { ProjectConfigIO } from '../../modules/projectConfig/projectConfigIO';
import { ProjectConfigLock } from '../../modules/projectConfig/projectConfigLock';
import { getLatestVersion, incrementVersionRange, resolveVersionIdentifier } from '../../modules/semver';
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
        'ignore-bounds': Flags.boolean({
            description: 'Ignores specified version ranges and will result in upgrading to the latest available semantic version',
            required: false,
        }),
        init: Flags.boolean({ description: 'Initializes components after upgrading them', required: false }),
        verbose: Flags.boolean({ char: 'v', aliases: ['verbose'], description: 'Enable verbose logging', required: false, default: false }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Upgrade);
        let projectConfigLock: ProjectConfigLock | null = ProjectConfigIO.readLock();

        if (!projectConfigLock) {
            throw new Error(`No .velocitas-lock.json found. Please 'velocitas init' first!`);
        }

        this.log(`Checking .velocitas.json for updates!`);
        const projectConfig = ProjectConfigIO.read(`v${this.config.version}`, undefined, true);
        let isAnyPackageUpdated: boolean = false;
        try {
            for (const packageConfig of projectConfig.getPackages()) {
                const isPackageUpdated = await this.updatePackageIfAvailable(packageConfig, projectConfig, projectConfigLock!, flags);
                if (isPackageUpdated) {
                    isAnyPackageUpdated = true;
                }
            }
            if (isAnyPackageUpdated && !flags.init) {
                this.log("Update available: Call 'velocitas init'");
            }
        } catch (error) {
            this.error(`Error during upgrade: '${error}'`);
        }
        if (flags.init && isAnyPackageUpdated) {
            const commandArgs = flags.verbose ? ['-v'] : [];
            await Init.run(commandArgs);
        }
    }

    async updatePackageIfAvailable(
        packageConfig: PackageConfig,
        projectConfig: ProjectConfig,
        projectConfigLock: ProjectConfigLock,
        flags: any,
    ): Promise<boolean> {
        const initialVersionSpecifier = packageConfig.version;
        const availableVersions = await packageConfig.getPackageVersions(flags.verbose);
        const matchedVersion = flags['ignore-bounds']
            ? getLatestVersion(availableVersions.all)
            : resolveVersionIdentifier(availableVersions, packageConfig.version);

        const lockedVersion = projectConfigLock.findVersion(packageConfig.repo);
        const packageStatus = lockedVersion === matchedVersion ? 'up to date!' : matchedVersion;
        this.log(`... ${packageConfig.getPackageName()}:${lockedVersion} → ${packageStatus}`);

        if (flags['dry-run'] || lockedVersion === matchedVersion) {
            return false;
        } else {
            packageConfig.setPackageVersion(incrementVersionRange(initialVersionSpecifier, matchedVersion));
            ProjectConfigIO.write(projectConfig);
            return true;
        }
    }
}
