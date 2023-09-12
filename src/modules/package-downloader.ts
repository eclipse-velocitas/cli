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

import { existsSync } from 'fs-extra';
import { posix as pathPosix } from 'path';
import { CheckRepoActions, SimpleGit, simpleGit } from 'simple-git';
import { PackageConfig } from './package';
import { getLatestVersion } from './semver';
import { SdkConfig } from './sdk';

export class PackageDownloader {
    packageConfig: PackageConfig | SdkConfig;
    git: SimpleGit = simpleGit();

    constructor(packageConfig: PackageConfig | SdkConfig) {
        this.packageConfig = packageConfig;
    }

    async cloneRepository(packageDir: string, cloneOpts: string[]): Promise<void> {
        await this.git.clone(this.packageConfig.getPackageRepo(), packageDir, cloneOpts);
    }

    async updateRepository(checkRepoAction: CheckRepoActions, packageDir: string, cloneOpts: string[]): Promise<void> {
        const localRepoExists = await this.git.checkIsRepo(checkRepoAction);

        if (localRepoExists) {
            await this.git.fetch(['--all']);
        } else {
            await this.git.clone(this.packageConfig.getPackageRepo(), packageDir, cloneOpts);
        }
    }

    async checkoutVersion(): Promise<void> {
        if (this.packageConfig.version === 'latest') {
            const repositoryVersions = await this.git.tags();
            this.packageConfig.version = repositoryVersions.latest ? repositoryVersions.latest : getLatestVersion(repositoryVersions.all);
        } else {
            await this.git.checkout(this.packageConfig.version);
        }
    }

    async downloadPackage(option: { checkVersionOnly: boolean }): Promise<SimpleGit> {
        let packageDir: string = this.packageConfig.getPackageDirectory();
        let cloneOpts: string[] = [];
        let checkRepoAction: CheckRepoActions;

        if (option.checkVersionOnly) {
            packageDir = pathPosix.join(packageDir, '_cache');
            cloneOpts.push('--bare');
            checkRepoAction = CheckRepoActions.BARE;
        } else {
            packageDir = pathPosix.join(packageDir, this.packageConfig.version);
            checkRepoAction = CheckRepoActions.IS_REPO_ROOT;
        }

        if (!existsSync(packageDir)) {
            await this.cloneRepository(packageDir, cloneOpts);
        }

        this.git = simpleGit(packageDir);
        await this.updateRepository(checkRepoAction, packageDir, cloneOpts);

        if (!option.checkVersionOnly) {
            await this.checkoutVersion();
        }

        return this.git;
    }
}

export const packageDownloader = (packageConfig: PackageConfig) => {
    return new PackageDownloader(packageConfig);
};

export const sdkDownloader = (sdkConfig: SdkConfig) => {
    return new PackageDownloader(sdkConfig);
};
