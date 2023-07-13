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

import { removeSync } from 'fs-extra';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CheckRepoActions, simpleGit, SimpleGit } from 'simple-git';
import { Component, ComponentType, deserializeComponentJSON } from './component';
import { DEFAULT_BUFFER_ENCODING } from './constants';
import { ComponentConfig } from './project-config';

export const GITHUB_ORG = 'eclipse-velocitas';
export const GITHUB_API_URL = 'https://api.github.com';
export const GITHUB_ORG_ENDPOINT = `/repos/${GITHUB_ORG}`;
export const MANIFEST_FILE_NAME = 'manifest.json';

export interface PackageManifest {
    components: Array<Component>;
}

export class PackageConfig {
    // name of the package to the package repository
    // @deprecated use repo instead
    repo: string = '';

    // version of the package to use
    version: string = '';

    // package-wide variable configuration
    variables?: Map<string, any>;
    // variables?: Map<string, any> = new Map<string, any>();

    // per-component configuration
    components?: Array<ComponentConfig>;
    // components?: Array<ComponentConfig> = new Array<ComponentConfig>();

    // enable development mode for package
    dev?: boolean;
    constructor(config?: any) {
        this.repo = config.name;
        this.version = config.version;
        if (config.variables) {
            this.variables = config.variables;
        }
        if (config.components) {
            this.components = config.components;
        }
    }

    private _isCustomPackage(repository: string): boolean {
        return repository.startsWith('ssh://') || repository.startsWith('http://') || repository.startsWith('https://');
    }
    /**
     * Return the fully qualified URL to the package repository.
     * In case of Eclipse Velocitas repos which can be referenced by name only,
     * their Github URL is returned.
     *
     * In case of custom URLs as package names, the package name is returned.
     *
     * @param repository The repository of the package.
     * @returns The fully qualified URL to the package repository.
     */
    getPackageRepo(): string {
        if (this._isCustomPackage(this.repo)) {
            return this.repo;
        }
        return `https://github.com/eclipse-velocitas/${this.repo}`;
    }

    getPackageName(): string {
        if (!this._isCustomPackage(this.repo)) {
            return this.repo;
        }
        const repoName = this.repo.substring(this.repo.lastIndexOf('/') + 1).replace('.git', '');
        return repoName;
    }

    getPackageDirectory(): string {
        return join(getPackageFolderPath(), this.getPackageName());
    }

    async getPackageVersions(): Promise<Array<string>> {
        try {
            const git = await this.cloneOrUpdateRepo(true);
            const tagsResult = await git.tags();

            const availableVersions = new Array<string>();
            for (const tagInfo of tagsResult.all) {
                availableVersions.push(tagInfo);
            }
            return availableVersions;
        } catch (error) {
            console.log(error);
        }

        return new Array<string>();
    }

    async cloneOrUpdateRepo(check: boolean): Promise<SimpleGit> {
        let packageDir = this.getPackageDirectory();
        let cloneOpts = new Array<string>();
        let checkRepoAction: CheckRepoActions;

        if (check) {
            packageDir = join(packageDir, '_cache');
            cloneOpts.push('--bare');
            checkRepoAction = CheckRepoActions.BARE;
        } else {
            packageDir = join(packageDir, this.version);
            checkRepoAction = CheckRepoActions.IS_REPO_ROOT;
        }

        if (!existsSync(packageDir)) {
            await simpleGit().clone(this.getPackageRepo(), packageDir, cloneOpts);
        }

        const git = simpleGit(packageDir);

        const localRepoExists = await git.checkIsRepo(checkRepoAction);
        if (localRepoExists) {
            await git.fetch(['--all']);
        } else {
            await git.clone(this.getPackageRepo(), packageDir, cloneOpts);
        }

        if (!check) {
            await git.checkout(this.version);
            // if (!this.dev) {
            //     removeSync(join(packageDir, '.git'));
            // }
        }
        return git;
    }

    async downloadPackageVersion(verbose?: boolean): Promise<void> {
        try {
            await this.cloneOrUpdateRepo(false);
        } catch (error) {
            console.error(error);
        }
        return;
    }

    isPackageInstalled(): boolean {
        const packageDir = `${getPackageFolderPath()}/${this.repo}/${this.version}`;
        if (!existsSync(packageDir)) {
            return false;
        }
        return true;
    }

    readPackageManifest(): PackageManifest {
        try {
            const config: PackageManifest = deserializeComponentJSON(
                readFileSync(join(this.getPackageDirectory(), this.version, MANIFEST_FILE_NAME), DEFAULT_BUFFER_ENCODING),
            );
            return config;
        } catch (error) {
            console.log(`Cannot find component ${this.getPackageName()}:${this.version}. Please upgrade or init first!`);
            throw new Error(`Cannot find component ${this.getPackageName()}:${this.version}`);
        }
    }
}

export function getVelocitasRoot(): string {
    return join(process.env.VELOCITAS_HOME ? process.env.VELOCITAS_HOME : homedir(), '.velocitas');
}

function getPackageFolderPath(): string {
    return join(getVelocitasRoot(), 'packages');
}

export function getComponentByType(packageManifest: PackageManifest, type: ComponentType): Component {
    const component = packageManifest.components.find((component: Component) => component.type === type);
    if (component === undefined) {
        throw new TypeError(`No Subcomponent with type "${type}" found!`);
    }
    return component;
}
