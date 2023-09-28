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
import { CheckRepoActions, GitError, SimpleGit, simpleGit } from 'simple-git';
import { LATEST_VERSION_LITERAL, PackageConfig } from './package';
import { getLatestVersion } from './semver';
import { SdkConfig } from './sdk';
import { wait } from './helpers';

export class PackageInformation {
    versions: string[];

    constructor(versions: string[]) {
        this.versions = versions;
    }
}

export class PackageDownloader {
    private _packageConfig: PackageConfig | SdkConfig;

    constructor(packageConfig: PackageConfig | SdkConfig) {
        this._packageConfig = packageConfig;
    }

    private async _gitRetryWrapper(fn: any) {
        const maxRetries = 3;
        const backOffMilliseconds = 5000;

        // start iteration at 1 in order to properly calculate an exponential back-off
        for (var i = 1; i <= maxRetries; ++i) {
            try {
                await fn;
                return;
            } catch (e) {
                if (i < maxRetries && e instanceof GitError) {
                    console.error(`......> Error: '${e.message}', retrying... ${i}/${maxRetries}`);
                    await wait(i * i * backOffMilliseconds);
                } else {
                    throw e;
                }
            }
        }
    }

    private async _tryGetInitializedRepo(basePath: string): Promise<SimpleGit | undefined> {
        const gitRepoForPath = simpleGit(basePath);
        if (await gitRepoForPath.checkIsRepo(CheckRepoActions.IS_REPO_ROOT)) {
            return gitRepoForPath;
        }
        return undefined;
    }

    async cloneRepository(cloneOpts: string[]): Promise<void> {
        await this._gitRetryWrapper(
            simpleGit().clone(this._packageConfig.getPackageRepo(), this._packageConfig.getPackageDirectory(), cloneOpts),
        );
    }

    async updateRepository(cloneOpts: string[]): Promise<void> {
        const maybeGitRepo = await this._tryGetInitializedRepo(this._packageConfig.getPackageDirectory());

        if (maybeGitRepo) {
            await this._gitRetryWrapper(maybeGitRepo.fetch(['--all', '--prune', '--prune-tags', '--tags']));
        } else {
            await this.cloneRepository(cloneOpts);
        }
    }

    private async _resolveLatestLiteral(simpleGit: SimpleGit): Promise<string> {
        // the latest version reference forces an update!
        await this.updateRepository([]);
        const repositoryVersions = await simpleGit.tags();
        return repositoryVersions.latest ? repositoryVersions.latest : getLatestVersion(repositoryVersions.all);
    }

    async checkoutVersion(): Promise<void> {
        const maybeGitRepo = await this._tryGetInitializedRepo(this._packageConfig.getPackageDirectory());

        if (!maybeGitRepo) {
            throw new GitError(undefined, 'Cannot check out the version of an invalid repo!');
        }

        let checkoutVersion = this._packageConfig.version;
        if (checkoutVersion === LATEST_VERSION_LITERAL) {
            checkoutVersion = await this._resolveLatestLiteral(maybeGitRepo);
        } else {
            let allTags = (await maybeGitRepo.tags()).all;
            let allBranches = (await maybeGitRepo.branch()).all;
            if (!allTags.includes(checkoutVersion) && !allBranches.includes(checkoutVersion)) {
                this.updateRepository([]);

                allTags = (await maybeGitRepo.tags()).all;
                allBranches = (await maybeGitRepo.branch()).all;
                if (!allTags.includes(checkoutVersion) && !allBranches.includes(checkoutVersion)) {
                    throw new Error(`${checkoutVersion} is not a valid package version!`);
                }
            }
        }
        await this._gitRetryWrapper(maybeGitRepo.checkout(this._packageConfig.version));
    }

    async downloadOrUpdatePackage(forcedUpdate = false): Promise<void> {
        const packageDir: string = this._packageConfig.getPackageDirectory();
        const cloneOpts: string[] = [];

        if (!existsSync(packageDir)) {
            await this.cloneRepository(cloneOpts);
        } else if (forcedUpdate) {
            await this.updateRepository(cloneOpts);
        }
    }

    async getPackageInfo(): Promise<PackageInformation> {
        await this.downloadOrUpdatePackage(true);
        const maybeGitRepo = await this._tryGetInitializedRepo(this._packageConfig.getPackageDirectory());
        return new PackageInformation((await maybeGitRepo!.tags()).all);
    }
}

export const packageDownloader = (packageConfig: PackageConfig) => {
    return new PackageDownloader(packageConfig);
};

export const sdkDownloader = (sdkConfig: SdkConfig) => {
    return new PackageDownloader(sdkConfig);
};
