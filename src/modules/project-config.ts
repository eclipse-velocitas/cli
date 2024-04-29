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

import { PathLike } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { CliFileSystem } from '../utils/fs-bridge';
import { DEFAULT_APP_MANIFEST_PATH } from './app-manifest';
import { ComponentConfig, ComponentContext } from './component';
import { mapReplacer } from './helpers';
import { PackageConfig, PackageConfigAttributes } from './package';
import { PackageIndex } from './package-index';
import { getLatestVersion } from './semver';
import { VariableCollection } from './variables';

export const DEFAULT_CONFIG_FILE_NAME = '.velocitas.json';
export const DEFAULT_CONFIG_LOCKFILE_NAME = '.velocitas-lock.json';
export const DEFAULT_CONFIG_FILE_PATH = resolve(cwd(), DEFAULT_CONFIG_FILE_NAME);
export const DEFAULT_CONFIG_LOCKFILE_PATH = resolve(cwd(), DEFAULT_CONFIG_LOCKFILE_NAME);

export interface ProjectConfigOptions {
    packages: PackageConfig[];
    components?: ComponentConfig[];
    variables: Map<string, any>;
    cliVersion?: string;
}

export class ProjectConfig {
    // packages used in the project
    private _packages: PackageConfig[] = [];

    // components used in the project
    private _components: ComponentConfig[] = [];

    // project-wide variable configuration
    private _variables: Map<string, any> = new Map<string, any>();

    // version of the CLI used by the project
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

    static read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH, ignoreLock: boolean = false): ProjectConfig {
        let config: ProjectConfig;
        let projectConfigLock: ProjectConfigLock | null = null;
        try {
            config = new ProjectConfig(cliVersion, JSON.parse(CliFileSystem.readFileSync(path as string)));
        } catch (error) {
            throw new Error(`Error in parsing ${DEFAULT_CONFIG_FILE_NAME}: ${(error as Error).message}`);
        }

        if (config._variables) {
            config._variables = new Map(Object.entries(config._variables));
        }

        if (!ignoreLock && ProjectConfigLock.isAvailable()) {
            projectConfigLock = ProjectConfigLock.read();
        }

        for (let packageConfig of config._packages) {
            if (packageConfig.variables) {
                packageConfig.variables = new Map(Object.entries(packageConfig.variables));
            }
            if (projectConfigLock) {
                packageConfig.version = projectConfigLock.findVersion(packageConfig.repo);
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

    static isAvailable = (path: PathLike = DEFAULT_CONFIG_FILE_PATH) => CliFileSystem.existsSync(path);

    static async create(usedComponents: Set<string>, packageIndex: PackageIndex, cliVersion: string) {
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
            const latestVersion = getLatestVersion(versions.all);

            packageConfig.repo = usedPackageRepo;
            packageConfig.version = latestVersion;
            projectConfig.getPackages().push(packageConfig);
        }
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
            componentsToSerialize = this.getComponents(false, true).map((cc) => cc.config);
        }

        const projectConfigOptions: ProjectConfigOptions = {
            packages: this._packages,
            components: componentsToSerialize,
            variables: this._variables,
            cliVersion: this.cliVersion,
        };
        const configString = `${JSON.stringify(projectConfigOptions, mapReplacer, 4)}\n`;
        CliFileSystem.writeFileSync(path, configString);
    }

    /**
     * Return the configuration of a component.
     *
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
     * @param onlyInstalled only retrieves the installed packages for the project. Defaults to false.
     * @returns all used packages by the project.
     */
    getPackages(onlyInstalled: boolean = false): PackageConfig[] {
        if (onlyInstalled) {
            return this._packages.filter((pkg) => pkg.isPackageInstalled());
        }

        return this._packages;
    }

    /**
     * Searches through all / only the installed packageConfigs for the packageConfig with the specified
     * name and returns it. If no packageConfig is found undefined is returned.
     * @param packageName the packageName of the packageConfig to retrieve for.
     * @param onlyInstalled true if searching only in the installed packages or false if all packages should be searched through.
     * @returns the found packageConfig or undefined if none could be found.
     */
    getPackageConfig(packageName: string, onlyInstalled: boolean = false): PackageConfig | undefined {
        return this.getPackages(onlyInstalled).find((config) => config.getPackageName() === packageName);
    }

    /**
     * Adds a new packageConfig to the project. This method won't add a new package if a package with the
     * same name already exists. Different versions are not taken into consideration. If updating the
     * version of a packageConfig is required use #updatePackageConfig.
     *
     * @param packageConfig the packageConfig to add.
     * @returns true if the package was added successfully, false otherwise.
     */
    addPackageConfig(packageConfig: PackageConfig): boolean {
        const existingPackage = this.getPackageConfig(packageConfig.getPackageName());

        if (!existingPackage) {
            this._packages.push(packageConfig);
            return true;
        }
        return false;
    }

    /**
     * Updates the version of the packageConfig with the same packageName as provided.
     *
     * @param packageConfig the updated packageConfig.
     * @returns true if the packageVersion was successfully updated, false otherwise.
     */
    updatePackageConfig(packageConfig: PackageConfig): boolean {
        const existingPackage = this.getPackageConfig(packageConfig.getPackageName());

        if (existingPackage && existingPackage.version !== packageConfig.version) {
            existingPackage?.setPackageVersion(packageConfig.version);
            return true;
        }
        return false;
    }

    /**
     * Add a component from a referenced package to the project.
     *
     * @param id ID of the component to add to the project.
     */
    addComponent(id: string): void {
        this._components.push(new ComponentConfig(id));
    }

    /**
     * Remove a used component from the project.
     *
     * @param id ID of the component to remove from the project.
     */
    removeComponent(id: string): void {
        this._components = this._components.filter((componentConfig) => componentConfig.id !== id);
    }

    /**
     * Return all components used by the project. If the project specifies no components explicitly,
     * all components are used by default.
     *
     * @param onlyUsed Only include components used by the project. Default: true.
     * @param onlyInstalled Only include components from packages which are installed. Default: false.
     * @returns A list of all components used by the project.
     */
    getComponents(onlyUsed: boolean = true, onlyInstalled: boolean = false): ComponentContext[] {
        const componentContexts: ComponentContext[] = [];

        let packageConfigs = this.getPackages(onlyInstalled);
        for (const packageConfig of packageConfigs) {
            const components = this.getComponentsForPackageConfig(packageConfig, onlyUsed);
            componentContexts.push(...components);
        }

        return componentContexts;
    }

    /**
     * Return all components used by the specified packageConfig. If the project specifies no components explicitly,
     * all components are used by default.
     *
     * @param packageConfig packageConfig to search the components for.
     * @param onlyUsed Only include components used by the project. Default: true.
     * @returns A list of all components used by this particular packageConfig.
     */
    getComponentsForPackageConfig(packageConfig: PackageConfig, onlyUsed: boolean = true): ComponentContext[] {
        const componentContexts: ComponentContext[] = [];
        const usedComponents = this._components;

        const packageManifest = packageConfig.readPackageManifest();

        for (const componentManifest of packageManifest.components) {
            const isComponentUsedByProject =
                usedComponents.length === 0 ||
                usedComponents.find((compCfg: ComponentConfig) => compCfg.id === componentManifest.id) !== undefined;
            if (!onlyUsed || isComponentUsedByProject) {
                componentContexts.push(
                    new ComponentContext(
                        packageConfig,
                        componentManifest,
                        this.getComponentConfig(componentManifest.id),
                        isComponentUsedByProject,
                    ),
                );
            }
        }

        return componentContexts;
    }

    validateUsedComponents() {
        // Check for components in usedComponents that couldn't be found in any componentManifest
        this._components.forEach((compCfg: ComponentConfig) => {
            const foundInManifest = this.getPackages(true).some((packageConfig) =>
                packageConfig.readPackageManifest().components.some((componentManifest) => componentManifest.id === compCfg.id),
            );
            if (!foundInManifest) {
                throw Error(`Component with ID '${compCfg.id}' not found in any package manifest!`);
            }
        });
    }

    /**
     * Find a single component by its ID.
     * @param componentId   The component ID to find.
     * @returns The context the component is used in.
     */
    findComponentByName(componentId: string): ComponentContext {
        let result = this.getComponents(undefined, true).find((compCtx: ComponentContext) => compCtx.manifest.id === componentId);

        if (!result) {
            throw Error(`Cannot find component with id '${componentId}'!`);
        }

        return result;
    }

    /**
     * @returns all declared variable mappings on project level.
     */
    getVariableMappings(): Map<string, any> {
        return this._variables;
    }

    getVariableCollection(currentComponentContext: ComponentContext): VariableCollection {
        return VariableCollection.build(this.getComponents(undefined, true), this.getVariableMappings(), currentComponentContext);
    }
}

export class ProjectConfigLock {
    packages: PackageConfig[];

    constructor(packages: PackageConfig[]) {
        this.packages = packages;
    }

    static isAvailable = (path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH) => CliFileSystem.existsSync(path);

    /**
     * Reads the locked project configuration from file.
     * @param path The path to the lock file. Defaults to DEFAULT_CONFIG_LOCKFILE_PATH if not provided.
     * @returns An instance of ProjectConfigLock if the lock file exists and is readable, or null if the file is not present.
     * @throws Error if there's an issue reading the lock file other than it not being present.
     */
    static read(path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): ProjectConfigLock | null {
        try {
            const data = JSON.parse(CliFileSystem.readFileSync(path as string));
            const packages = data.packages;
            return new ProjectConfigLock(packages);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return null;
            } else {
                throw new Error(`Error reading lock file: ${error.message}`);
            }
        }
    }

    /**
     * Writes the locked project configuration to file.
     * @param projectConfig Project configuration to get the packages for the lock file.
     * @param path Path of the file to write the configuration to. Defaults to DEFAULT_CONFIG_LOCKFILE_PATH.
     */
    static write(projectConfig: ProjectConfig, path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): void {
        try {
            const projectConfigOptions = {
                packages: projectConfig.getPackages(),
            };
            const configString = JSON.stringify(projectConfigOptions, null, 4);
            CliFileSystem.writeFileSync(path, configString);
        } catch (error) {
            throw new Error(`Error writing .velocitas-lock.json: ${error}`);
        }
    }

    /**
     * Finds the version of the specified package from the lock file.
     * @param packageName Name of the package to find the version for.
     * @returns The version of the specified package if found.
     * @throws Error if the lock file is corrupted, the package is not found, or no version is stored for the package.
     */
    public findVersion(packageName: string): string {
        const packageConfig = this.packages.find((pkg: PackageConfigAttributes) => pkg.repo === packageName);

        if (!packageConfig) {
            throw new Error(`Package '${packageName}' not found in lock file.`);
        }

        if (!packageConfig.version) {
            throw new Error(`No version found for package '${packageName}' in lock file.`);
        }

        return packageConfig.version;
    }
}
