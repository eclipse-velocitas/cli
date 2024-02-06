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
import { PackageIndex } from './package-index';
import { DEFAULT_APP_MANIFEST_PATH } from './app-manifest';
import { ComponentContext, ComponentManifest } from './component';
import { VariableCollection } from './variables';

export const DEFAULT_CONFIG_FILE_NAME = '.velocitas.json';
export const DEFAULT_CONFIG_FILE_PATH = resolve(cwd(), DEFAULT_CONFIG_FILE_NAME);

export interface ProjectConfigOptions {
    packages: PackageConfig[];
    components?: ComponentConfig[];
    variables: Map<string, any>;
    cliVersion?: string;
}

export class ProjectConfig {
    // packages used in the project
    private _packages: Array<PackageConfig> = new Array<PackageConfig>();

    // components used in the project
    private _components: Array<ComponentConfig> = new Array<ComponentConfig>();

    // project-wide variable configuration
    private _variables: Map<string, any> = new Map<string, any>();
    cliVersion: string;

    private static _parsePackageConfig(packages: PackageConfig[]): PackageConfig[] {
        const configArray: PackageConfig[] = [];
        packages.forEach((packageConfig: PackageConfig) => {
            configArray.push(new PackageConfig(packageConfig));
        });
        return configArray;
    }
    /**
     * Create a new project configuration.
     *
     * @param config The options to use when creating the confugration. May be undefined.
     */
    constructor(cliVersion: string, config?: ProjectConfigOptions) {
        this._packages = config?.packages ? ProjectConfig._parsePackageConfig(config.packages) : this._packages;
        this._components = config?.components ? config.components : this._components;
        this._variables = config?.variables ? config.variables : this._variables;
        this.cliVersion = config?.cliVersion ? config.cliVersion : cliVersion;
    }

    static read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH): ProjectConfig {
        let config: ProjectConfig;

        try {
            config = new ProjectConfig(cliVersion, JSON.parse(readFileSync(path, DEFAULT_BUFFER_ENCODING)));
        } catch (error) {
            throw new Error(`Error in parsing ${DEFAULT_CONFIG_FILE_NAME}: ${(error as Error).message}`);
        }

        if (config._variables) {
            config._variables = new Map(Object.entries(config._variables));
        }

        for (let packageConfig of config._packages) {
            if (packageConfig.variables) {
                packageConfig.variables = new Map(Object.entries(packageConfig.variables));
            }
        }

        if (config._components) {
            for (let componentConfig of config._components) {
                if (componentConfig.variables) {
                    componentConfig.variables = new Map(Object.entries(componentConfig.variables));
                }
            }
        }

        return config;
    }

    static isAvailable = (path: PathLike = DEFAULT_CONFIG_FILE_PATH) => existsSync(path);

    static async create(usedComponents: Set<string>, packageIndex: PackageIndex, language: string, cliVersion: string) {
        const projectConfig = new ProjectConfig(`v${cliVersion}`);
        const usedPackageRepos = new Set<string>();
        for (const usedComponent of usedComponents) {
            const pkg = packageIndex.getPackageByComponentId(usedComponent);
            usedPackageRepos.add(pkg.package);
            projectConfig._components.push(new ComponentConfig(usedComponent));
        }

        for (const usedPackageRepo of usedPackageRepos) {
            const packageConfig = new PackageConfig({ repo: usedPackageRepo, version: '' });
            const versions = await packageConfig.getPackageVersions();
            const latestVersion = getLatestVersion(versions);

            packageConfig.repo = usedPackageRepo;
            packageConfig.version = latestVersion;
            projectConfig.getPackages().push(packageConfig);
        }
        projectConfig.getVariableMappings().set('language', language);
        projectConfig.getVariableMappings().set('repoType', 'app');
        projectConfig.getVariableMappings().set('appManifestPath', DEFAULT_APP_MANIFEST_PATH);
        projectConfig.getVariableMappings().set('githubRepoId', '<myrepo>');
        projectConfig.write();
    }

    /**
     * Write the project configuration to file.
     *
     * @param path Path of the file to write the configuration to.
     */
    write(path: PathLike = DEFAULT_CONFIG_FILE_PATH): void {
        // if we find an "old" project configuration with no components explicitly mentioned
        // we persist all components we can find.
        let componentsToSerialize: ComponentConfig[] = this._components;

        if (!componentsToSerialize || componentsToSerialize.length === 0) {
            componentsToSerialize = this.getComponents().map((cc) => cc.config);
        }

        const projectConfigOptions: ProjectConfigOptions = {
            packages: this._packages,
            components: componentsToSerialize,
            variables: this._variables,
            cliVersion: this.cliVersion,
        };
        const configString = `${JSON.stringify(projectConfigOptions, mapReplacer, 4)}\n`;
        writeFileSync(path, configString, DEFAULT_BUFFER_ENCODING);
    }

    /**
     * Return the configuration of a component.
     *
     * @param projectConfig The project configuration.
     * @param componentId   The ID of the component.
     * @returns The configuration of the component.
     */
    getComponentConfig(componentId: string): ComponentConfig {
        let maybeComponentConfig: ComponentConfig | undefined;
        if (this._components) {
            maybeComponentConfig = this._components.find((compCfg: ComponentConfig) => compCfg.id === componentId);
        }
        return maybeComponentConfig ? maybeComponentConfig : new ComponentConfig(componentId);
    }

    /**
     * Return all components used by the project. If the project specifies no components explicitly,
     * all components are used by default.
     *
     * @returns A list of all components used by the project.
     */
    getComponents(): Array<ComponentContext> {
        const componentContextes: ComponentContext[] = [];

        const usedComponents = this._components;

        for (const packageConfig of this.getPackages()) {
            const packageManifest = packageConfig.readPackageManifest();

            for (const componentManifest of packageManifest.components) {
                if (usedComponents.length === 0 || usedComponents.find((compCfg: ComponentConfig) => compCfg.id === componentManifest.id)) {
                    componentContextes.push(
                        new ComponentContext(
                            packageConfig,
                            componentManifest,
                            this.getComponentConfig(componentManifest.id),
                            VariableCollection.build(this, packageConfig, this.getComponentConfig(componentManifest.id), componentManifest),
                        ),
                    );
                }
            }
        }

        return componentContextes;
    }

    /**
     * @returns all used packages by the project.
     */
    getPackages(): Array<PackageConfig> {
        return this._packages;
    }

    /**
     * @returns all declared variable mappings on project level.
     */
    getVariableMappings(): Map<string, any> {
        return this._variables;
    }
}

export class ComponentConfig {
    // ID of the component
    id: string;

    // component-wide variable configuration
    variables?: Map<string, any>;

    constructor(id: string) {
        this.id = id;
    }
}
