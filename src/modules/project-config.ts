// Copyright (c) 2023-2024 Contributors to the Eclipse Foundation
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

import { existsSync, PathLike, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { cwd } from 'process';
import { DEFAULT_BUFFER_ENCODING } from './constants';
import { mapReplacer } from './helpers';
import { PackageConfig } from './package';
import { getLatestVersion } from './semver';
import { PackageAttributes } from './package-index';
import { DEFAULT_APP_MANIFEST_PATH } from './app-manifest';

export const DEFAULT_CONFIG_FILE_PATH = resolve(cwd(), './.velocitas.json');

interface ProjectConfigOptions {
    packages: PackageConfig[];
    variables: Map<string, any>;
    cliVersion?: string;
}

export class ProjectConfig implements ProjectConfigOptions {
    // packages used in the project
    packages: Array<PackageConfig> = new Array<PackageConfig>();

    // project-wide variable configuration
    variables: Map<string, any> = new Map<string, any>();
    cliVersion: string;

    private static _parsePackageConfig(packages: PackageConfig[]): PackageConfig[] {
        const configArray: PackageConfig[] = [];
        packages.forEach((packageConfig: PackageConfig) => {
            configArray.push(new PackageConfig(packageConfig));
        });
        return configArray;
    }

    constructor(cliVersion: string, config?: ProjectConfigOptions) {
        this.packages = config?.packages ? ProjectConfig._parsePackageConfig(config.packages) : this.packages;
        this.variables = config?.variables ? config.variables : this.variables;
        this.cliVersion = config?.cliVersion ? config.cliVersion : cliVersion;
    }

    static read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH): ProjectConfig {
        let config: ProjectConfig;

        try {
            config = new ProjectConfig(cliVersion, JSON.parse(readFileSync(path, DEFAULT_BUFFER_ENCODING)));
        } catch (error) {
            throw new Error(`Error in parsing .velocitas.json: ${(error as Error).message}`);
        }

        if (config.variables) {
            config.variables = new Map(Object.entries(config.variables));
        }

        for (let packageConfig of config.packages) {
            if (packageConfig.variables) {
                packageConfig.variables = new Map(Object.entries(packageConfig.variables));
            }

            if (packageConfig.components) {
                for (let componentConfig of packageConfig.components) {
                    if (componentConfig.variables) {
                        componentConfig.variables = new Map(Object.entries(componentConfig.variables));
                    }
                }
            }
        }

        return config;
    }

    static isAvailable = (path: PathLike = DEFAULT_CONFIG_FILE_PATH) => existsSync(path);

    static async create(usedPackages: PackageAttributes[], language: string, cliVersion: string) {
        const projectConfig = new ProjectConfig(`v${cliVersion}`);
        for (const usedPackage of usedPackages) {
            const packageConfig = new PackageConfig({ name: usedPackage.package });
            const versions = await packageConfig.getPackageVersions();
            const latestVersion = getLatestVersion(versions);

            packageConfig.repo = usedPackage.package;
            packageConfig.version = latestVersion;
            projectConfig.packages.push(packageConfig);
        }
        projectConfig.variables.set('language', language);
        projectConfig.variables.set('repoType', 'app');
        projectConfig.variables.set('appManifestPath', DEFAULT_APP_MANIFEST_PATH);
        projectConfig.variables.set('githubRepoId', '<myrepo>');
        projectConfig.write();
    }

    write(path: PathLike = DEFAULT_CONFIG_FILE_PATH): void {
        // replaceAll because of having "backward compatibility" before deprecate "name" completely
        const configString = `${JSON.stringify(this, mapReplacer, 4).replaceAll('"repo"', '"name"')}\n`;
        writeFileSync(path, configString, DEFAULT_BUFFER_ENCODING);
    }
}

export class ComponentConfig {
    // ID of the component
    id: string = '';

    // component-wide variable configuration
    variables: Map<string, any> = new Map<string, any>();
}
