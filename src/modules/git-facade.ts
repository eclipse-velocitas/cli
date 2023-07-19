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

export class GitFacade {
    packageConfig: PackageConfig;

    constructor(packageConfig: PackageConfig) {
        this.packageConfig = packageConfig;
    }

    async cloneRepository(packageDir: string, cloneOpts: string[]): Promise<void> {
        await simpleGit().clone(this.packageConfig.getPackageRepo(), packageDir, cloneOpts);
    }

    async updateRepository(git: SimpleGit, checkRepoAction: CheckRepoActions, packageDir: string, cloneOpts: string[]): Promise<void> {
        const localRepoExists = await git.checkIsRepo(checkRepoAction);

        if (localRepoExists) {
            await git.fetch(['--all']);
        } else {
            await git.clone(this.packageConfig.getPackageRepo(), packageDir, cloneOpts);
        }
    }

    async checkoutVersion(git: SimpleGit): Promise<void> {
        await git.checkout(this.packageConfig.version);
    }

    async cloneOrUpdateRepo(check: boolean): Promise<SimpleGit> {
        let packageDir: string = this.packageConfig.getPackageDirectory();
        let cloneOpts: string[] = [];
        let checkRepoAction: CheckRepoActions;

        if (check) {
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

        const git: SimpleGit = simpleGit(packageDir);
        await this.updateRepository(git, checkRepoAction, packageDir, cloneOpts);

        if (!check) {
            await this.checkoutVersion(git);
        }

        return git;
    }
}
