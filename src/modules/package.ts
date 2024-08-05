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

import { homedir } from 'node:os';
import { join } from 'node:path';
import { TagResult } from 'simple-git';
import { CliFileSystem } from '../utils/fs-bridge';
import { ComponentManifest } from './component';
import { packageDownloader } from './package-downloader';

export const MANIFEST_FILE_NAME = 'manifest.json';

export interface PackageManifest {
    components: ComponentManifest[];
}

export interface PackageConfigAttributes {
    repo: string;
    version: string;
    variables?: Map<string, any>;
}

export class PackageConfig {
    // name of the package to the package repository
    repo: string;

    // version of the package to use
    version: string;

    // package-wide variable configuration
    variables: Map<string, any> = new Map<string, any>();

    constructor(attributes: PackageConfigAttributes) {
        this.repo = attributes.repo;
        this.version = attributes.version;
        this.variables = attributes.variables ? attributes.variables : this.variables;
    }

    private _isCustomPackage(): boolean {
        return this.repo.endsWith('.git');
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
        if (this._isCustomPackage()) {
            return this.repo;
        }
        return `https://github.com/eclipse-velocitas/${this.repo}`;
    }

    getPackageName(): string {
        if (!this._isCustomPackage()) {
            return this.repo;
        }
        const repoName = this.repo.substring(this.repo.lastIndexOf('/') + 1).replace('.git', '');
        return repoName;
    }

    getPackageDirectory(): string {
        return join(getPackageFolderPath(), this.getPackageName());
    }

    getPackageDirectoryWithVersion(): string {
        return join(this.getPackageDirectory(), this.version);
    }

    getManifestFilePath(): string {
        return join(this.getPackageDirectoryWithVersion(), MANIFEST_FILE_NAME);
    }

    setPackageVersion(version: string): void {
        this.version = version;
    }

    async getPackageVersions(verbose?: boolean): Promise<TagResult> {
        try {
            const packageInformation = await packageDownloader(this).downloadPackage({ checkVersionOnly: true, verbose: verbose });
            const packageVersionTags = await packageInformation.tags();
            return packageVersionTags;
        } catch (error) {
            console.log(error);
        }
        return {
            all: [],
            latest: '',
        };
    }

    async downloadPackageVersion(verbose?: boolean): Promise<void> {
        try {
            await packageDownloader(this).downloadPackage({ verbose: verbose });
        } catch (error) {
            console.error(error);
            // If repo exist but not version we will end up with default-version
            // of that repo, and on subsequent runs tooling will say that the missing version
            // actually exists! To prevent this we remove the directory of the missing version!
            CliFileSystem.removeSync(this.getPackageDirectoryWithVersion());
            throw new Error(`Cannot find package ${this.getPackageName()}:${this.version}`);
        }
        return;
    }

    isPackageInstalled(): boolean {
        return CliFileSystem.existsSync(this.getPackageDirectoryWithVersion());
    }

    async isPackageValidRepo(verbose?: boolean): Promise<boolean> {
        const isValid = await packageDownloader(this).isValidRepo(this.getPackageDirectoryWithVersion());
        if (!isValid && verbose) {
            console.log(`... Corrupted .git directory found for: '${this.getPackageName()}:${this.version}'`);
        }
        return isValid;
    }

    readPackageManifest(): PackageManifest {
        let data;
        try {
            const path = this.getManifestFilePath();
            data = CliFileSystem.readFileSync(path);
        } catch (error) {
            console.log(`Cannot find package ${this.getPackageName()}:${this.version}. Please upgrade or init first!`);
            throw new Error(`Cannot find package ${this.getPackageName()}:${this.version}`);
        }
        try {
            const config: PackageManifest = deserializePackageJSON(data);
            return config;
        } catch (error) {
            console.log(`Cannot parse manifest file for ${this.getPackageName()}:${this.version}.`);
            console.log(error);
            throw new Error(`Cannot parse manifest file for ${this.getPackageName()}:${this.version}.`);
        }
    }
}

export function getVelocitasRoot(): string {
    return join(process.env.VELOCITAS_HOME ? process.env.VELOCITAS_HOME : homedir(), '.velocitas');
}

export function getPackageFolderPath(): string {
    return join(getVelocitasRoot(), 'packages');
}

// use this to deserialize JSON instead of plain JSON.parse
export function deserializePackageJSON(json: string) {
    return JSON.parse(json);
}
