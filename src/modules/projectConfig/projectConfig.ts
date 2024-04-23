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

import { DEFAULT_APP_MANIFEST_PATH } from '../app-manifest';
import { ComponentConfig, ComponentContext } from '../component';
import { PackageConfig } from '../package';
import { PackageIndex } from '../package-index';
import { getLatestVersion } from '../semver';
import { VariableCollection } from '../variables';

export interface ProjectConfigAttributes {
    packages: PackageConfig[];
    components: ComponentConfig[];
    variables: Map<string, any>;
    cliVersion: string;
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

    /**
     * Create a new project configuration.
     *
     * @param cliVersion The version of the CLI used by the project.
     * @param config The options to use when creating the configuration. May be undefined.
     */
    constructor(cliVersion: string, config?: ProjectConfigAttributes) {
        this._packages = config?.packages ? config.packages : [];
        this._components = config?.components ? config.components : [];
        this._variables = config?.variables ? config.variables : new Map<string, any>();
        this.cliVersion = config?.cliVersion ? config.cliVersion : cliVersion;
    }

    /**
     * Creates a new project configuration based on the provided components, package index, and CLI version.
     * @param usedComponents A set of component IDs used in the project.
     * @param packageIndex A package index object.
     * @param cliVersion The version of the CLI.
     * @returns A created ProjectConfig instance.
     */
    static async create(usedComponents: Set<string>, packageIndex: PackageIndex, cliVersion: string): Promise<ProjectConfig> {
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
        return projectConfig;
    }

    /**
     * Returns the configuration of a component.
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
     * Adds a component from a referenced package to the project.
     *
     * @param id ID of the component to add to the project.
     */
    addComponent(id: string): void {
        this._components.push(new ComponentConfig(id));
    }

    /**
     * Removes a used component from the project.
     *
     * @param id ID of the component to remove from the project.
     */
    removeComponent(id: string): void {
        this._components = this._components.filter((componentConfig) => componentConfig.id !== id);
    }

    /**
     * Returns the contexts of all components used by the project. If the project specifies no components explicitly,
     * all components are used by default.
     *
     * @param onlyUsed Only include components used by the project. Default: true.
     * @returns A list of all components used by the project.
     */
    getComponentContexts(onlyUsed: boolean = true): ComponentContext[] {
        const componentContexts: ComponentContext[] = [];
        const usedComponents = this._components;

        for (const packageConfig of this.getPackages()) {
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
        }

        return componentContexts;
    }

    /**
     * Validates the used components by checking if each component is found in any package manifest.
     * Throws an error if a component is not found in any package manifest.
     */
    validateUsedComponents(): void {
        // Check for components in usedComponents that couldn't be found in any componentManifest
        this._components.forEach((compCfg: ComponentConfig) => {
            const foundInManifest = this.getPackages().some((packageConfig) =>
                packageConfig.readPackageManifest().components.some((componentManifest) => componentManifest.id === compCfg.id),
            );
            if (!foundInManifest) {
                throw Error(`Component with ID '${compCfg.id}' not found in any package manifest!`);
            }
        });
    }

    /**
     * Finds a single component by its ID.
     * @param componentId   The component ID to find.
     * @returns The context the component is used in.
     */
    findComponentByName(componentId: string): ComponentContext {
        let result = this.getComponentContexts().find((compCtx: ComponentContext) => compCtx.manifest.id === componentId);

        if (!result) {
            throw Error(`Cannot find component with id '${componentId}'!`);
        }

        return result;
    }

    /**
     * @returns all used packages by the project.
     */
    getPackages(): PackageConfig[] {
        return this._packages;
    }

    /**
     * @returns all used components by the project.
     */
    getComponents(): ComponentConfig[] {
        return this._components;
    }

    /**
     * @returns all declared variable mappings on project level.
     */
    getVariableMappings(): Map<string, any> {
        return this._variables;
    }

    /**
     * Gets a variable collection for the specified component context.
     * @param componentContext The context of the component for which the variable collection is obtained.
     * @returns A variable collection containing variables from the project configuration and component context.
     */
    getVariableCollection(componentContext: ComponentContext): VariableCollection {
        return VariableCollection.build(this.getComponentContexts(), this.getVariableMappings(), componentContext);
    }
}
