// Copyright (c) 2022-2023 Contributors to the Eclipse Foundation
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

import { existsSync, readFileSync } from 'fs-extra';
import { homedir } from 'os';
import { join } from 'path';
import { Component, ComponentType, deserializeComponentJSON } from './component';
import { DEFAULT_BUFFER_ENCODING } from './constants';
import { ComponentConfig } from './project-config';
import { packageDownloader } from './package-downloader';

export const MANIFEST_FILE_NAME = 'manifest.json';

export interface PackageManifest {
    components: Component[];
}

export class PackageConfig {
    // name of the package to the package repository
    // @deprecated use repo instead
    repo: string = '';

    // version of the package to use
    version: string = '';

    // package-wide variable configuration
    variables?: Map<string, any>;

    // per-component configuration
    components?: ComponentConfig[];

    constructor(config?: any) {
        const { name, version, variables, components } = config;
        this.repo = name;
        this.version = version;
        this.variables = variables;
        this.components = components;
    }

    private _isCustomPackage(repository: string): boolean {
        return repository.endsWith('.git');
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

    getPackageDirectoryWithVersion(): string {
        return join(this.getPackageDirectory(), this.version);
    }

    async getPackageVersions(): Promise<string[]> {
        try {
            const packageInformation = await packageDownloader(this).downloadPackage({ checkVersionOnly: true });
            const packageVersionTags = await packageInformation.tags();
            return packageVersionTags.all;
        } catch (error) {
            console.log(error);
        }
        return [];
    }

    async downloadPackageVersion(verbose?: boolean): Promise<void> {
        try {
            await packageDownloader(this).downloadPackage({ checkVersionOnly: false });
        } catch (error) {
            console.error(error);
        }
        return;
    }

    isPackageInstalled(): boolean {
        if (!existsSync(this.getPackageDirectoryWithVersion())) {
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
