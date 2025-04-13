// Copyright (c) 2023-2025 Contributors to the Eclipse Foundation
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

import { join } from 'node:path';
import { CheckRepoActions, ResetMode, SimpleGit, simpleGit } from 'simple-git';
import { CliFileSystem } from '../utils/fs-bridge';
import { PackageConfig } from './package';
import { BRANCH_PREFIX } from './semver';

export class PackageDownloader {
    packageConfig: PackageConfig;
    git: SimpleGit = simpleGit();

    constructor(packageConfig: PackageConfig) {
        this.packageConfig = packageConfig;
    }

    private async _cloneRepository(packageDir: string, cloneOpts: string[], verbose?: boolean): Promise<void> {
        const response = await this.git.clone(this.packageConfig.getPackageRepo(), packageDir, cloneOpts);
        if (verbose) {
            console.log(`Clone response:  ${response}`);
        }
    }

    private async _updateRepository(checkRepoAction: CheckRepoActions, verbose: boolean): Promise<void> {
        const localRepoExists = await this.git.checkIsRepo(checkRepoAction);

        if (localRepoExists) {
            try {
                await this.git.fetch(['--force', '--tags', '--prune', '--prune-tags']);
            } catch (error) {
                if (verbose) {
                    console.log(`... Could not check the server version for ${this.packageConfig.repo}`);
                }
            }
        }
    }

    private async _checkoutVersion(version: string): Promise<void> {
        const branchOrTag = version.startsWith(BRANCH_PREFIX) ? `origin/${version.substring(BRANCH_PREFIX.length)}` : version;
        // Make sure that repo is clean to avoid that checkout fails!
        await this.git.reset(ResetMode.HARD);
        await this.git.checkout(branchOrTag);
    }

    private async _checkForValidRepo(
        packageDir: string,
        cloneOpts: string[],
        checkRepoAction: CheckRepoActions,
        verbose?: boolean,
    ): Promise<void> {
        let directoryExists = CliFileSystem.existsSync(packageDir);
        if (directoryExists && !(await this.isValidRepo(packageDir, checkRepoAction))) {
            CliFileSystem.removeSync(packageDir);
            directoryExists = false;
        }

        if (!directoryExists) {
            try {
                // simple-git typically throws an error if clone fails
                // but not all errors reult in an exception, for instance blocked clone due to rate limitation
                // does not result in an exception
                await this._cloneRepository(packageDir, cloneOpts, verbose);
            } catch (error) {
                if (verbose) {
                    console.error(error);
                }
                throw new Error(`Cloning of ${this.packageConfig.getPackageRepo()} failed!`);
            }

            // Do a second check to verify if clone seems to have succeeded
            if (!(await this.isValidRepo(packageDir, checkRepoAction))) {
                throw new Error(`Problem detected when cloning ${this.packageConfig.getPackageRepo()}!`);
            }
        }
    }

    public async isValidRepo(packageDir: string, checkRepoAction?: CheckRepoActions): Promise<boolean> {
        return await simpleGit(packageDir).checkIsRepo(checkRepoAction);
    }

    public async downloadPackage(option: { checkVersionOnly?: boolean; verbose?: boolean }): Promise<SimpleGit> {
        const { checkVersionOnly = false, verbose = false } = option;
        let packageDir: string = this.packageConfig.getPackageDirectory();
        let checkRepoAction: CheckRepoActions;
        const cloneOpts: string[] = [];

        if (checkVersionOnly) {
            packageDir = join(packageDir, '_cache');
            cloneOpts.push('--bare');
            checkRepoAction = CheckRepoActions.BARE;
        } else {
            packageDir = join(packageDir, this.packageConfig.version);
            checkRepoAction = CheckRepoActions.IS_REPO_ROOT;
        }

        await this._checkForValidRepo(packageDir, cloneOpts, checkRepoAction, verbose);
        this.git = simpleGit(packageDir);
        await this._updateRepository(checkRepoAction, verbose);

        if (!checkVersionOnly) {
            await this._checkoutVersion(this.packageConfig.version);
        }

        return this.git;
    }
}

export const packageDownloader = (packageConfig: PackageConfig): PackageDownloader => {
    return new PackageDownloader(packageConfig);
};
