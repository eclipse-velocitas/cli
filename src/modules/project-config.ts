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

import { existsSync, PathLike, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { cwd } from 'process';
import { DEFAULT_BUFFER_ENCODING } from './constants';
import { mapReplacer } from './helpers';
import { PackageConfig } from './package';

export const DEFAULT_CONFIG_FILE_PATH = resolve(cwd(), './.velocitas.json');

interface ProjectConfigOptions {
    packages: PackageConfig[];
    variables: Map<string, any>;
}

export class ProjectConfig implements ProjectConfigOptions {
    // packages used in the project
    packages: Array<PackageConfig> = new Array<PackageConfig>();

    // project-wide variable configuration
    variables: Map<string, any> = new Map<string, any>();

    private static _parsePackageConfig(packages: PackageConfig[]): PackageConfig[] {
        const configArray: PackageConfig[] = [];
        packages.forEach((packageConfig: PackageConfig) => {
            configArray.push(new PackageConfig(packageConfig));
        });
        return configArray;
    }

    constructor(config?: ProjectConfigOptions) {
        this.packages = config?.packages ? ProjectConfig._parsePackageConfig(config.packages) : this.packages;
        this.variables = config?.variables ? config.variables : this.variables;
    }

    static read(path: PathLike = DEFAULT_CONFIG_FILE_PATH): ProjectConfig {
        let config: ProjectConfig;

        try {
            config = new ProjectConfig(JSON.parse(readFileSync(path, DEFAULT_BUFFER_ENCODING)));
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
