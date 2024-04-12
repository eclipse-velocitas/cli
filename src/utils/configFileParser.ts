// Copyright (c) 2024 Contributors to the Eclipse Foundation
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
import { ComponentConfig } from '../modules/component';
import { PackageConfig } from '../modules/package';
import { ProjectConfigLock } from '../modules/project-config';
import { CliFileSystem } from './fs-bridge';

export class ConfigFileParser {
    private _configFileData: any;
    private _ignoreLock: boolean;
    packages: PackageConfig[];
    components: ComponentConfig[];
    variables: Map<string, any>;
    cliVersion: string;

    /**
     * Converts an array of PackageConfig objects into a Map with repository names as keys and version numbers as values.
     * @param packageConfig Array of PackageConfig objects.
     * @returns A Map containing repository names as keys and version numbers as values.
     */
    static parsePackageConfigArrayToMap(packageConfig: PackageConfig[]): Map<string, any> {
        return new Map(packageConfig.map((pkg: PackageConfig) => [pkg.repo, pkg.version]));
    }

    /**
     * Converts an array of ComponentConfig objects into a Set of component IDs.
     * @param componentConfig Array of ComponentConfig objects.
     * @returns A Set containing the IDs of the components.
     */
    static parseComponentConfigArrayToSet(componentConfig: ComponentConfig[]): string[] {
        return Array.from(new Set(componentConfig.map((component: ComponentConfig) => component.id)));
    }

    /**
     * Parses project configuration variables and assigns them to the package configuration.
     * @param projectConfigVariables Project configuration variables.
     * @param packageConfig Package configuration to which the variables will be assigned.
     */
    private _parseVariables(configToParse: PackageConfig | ComponentConfig): void {
        for (const [variableKey, variableValue] of this.variables) {
            if (configToParse instanceof PackageConfig && variableKey.includes(configToParse.repo)) {
                const [parsedVariableKey] = variableKey.split('@');
                configToParse.variables?.set(parsedVariableKey, variableValue);
            }
            if (configToParse instanceof ComponentConfig && variableKey.includes(configToParse.id)) {
                const [parsedVariableKey] = variableKey.split('@');
                configToParse.variables?.set(parsedVariableKey, variableValue);
            }
        }
    }

    private _parseVariablesFromConfig(configFileVariables: any): Map<string, any> {
        if (!configFileVariables) {
            return new Map<string, any>();
        }
        if (!(configFileVariables instanceof Map)) {
            return new Map<string, any>(Object.entries(configFileVariables));
        }
        return new Map<string, any>();
    }

    private _handlePackages(ignoreLock: boolean) {
        let projectConfigLock: ProjectConfigLock | null = null;

        for (let packageConfig of this.packages) {
            this._parseVariables(packageConfig);
            if (!ignoreLock && ProjectConfigLock.isAvailable()) {
                projectConfigLock = ProjectConfigLock.read();
            }
            if (projectConfigLock) {
                packageConfig.version = projectConfigLock.findVersion(packageConfig.repo);
            }
        }
    }

    /**
     * Converts a Map with repository names as keys and version numbers as values into an array of PackageConfig objects.
     * @param packages Map containing repository names as keys and version numbers as values.
     * @returns An array of PackageConfig objects.
     */
    private _parseConfigToPackageConfigArray(configFilePackages: any): PackageConfig[] {
        const configArray: PackageConfig[] = [];
        const packages = configFilePackages instanceof Map ? configFilePackages : new Map(Object.entries(configFilePackages));

        for (const [repoName, version] of packages) {
            const pkgCfg = new PackageConfig({ repo: repoName, version: version });
            this._parseVariables(pkgCfg);
            configArray.push(pkgCfg);
        }
        this.packages = configArray;
        this._handlePackages(this._ignoreLock);
        return configArray;
    }

    /**
     * Converts a Set of component IDs into an array of ComponentConfig objects.
     * @param components Set of component IDs.
     * @returns An array of ComponentConfig objects.
     */
    private _parseConfigToComponentConfigArray(configFileComponents: any): ComponentConfig[] {
        if (!configFileComponents) {
            return [];
        }

        const cmpCfgArray: ComponentConfig[] = configFileComponents.map((component: string) => {
            const cmpCfg = new ComponentConfig(component);
            if (this.variables) {
                this._parseVariables(cmpCfg);
            }
            return cmpCfg;
        });
        return cmpCfgArray;
    }

    constructor(configFilePath: PathLike, ignoreLock: boolean) {
        try {
            this._configFileData = JSON.parse(CliFileSystem.readFileSync(configFilePath as string));
            this._ignoreLock = ignoreLock;
            this.variables = this._parseVariablesFromConfig(this._configFileData.variables);
            this.packages = this._parseConfigToPackageConfigArray(this._configFileData.packages);
            this.components = this._parseConfigToComponentConfigArray(this._configFileData.components);
            this.cliVersion = this._configFileData.cliVersion ? this._configFileData.cliVersion : '';
        } catch (error) {
            throw new Error(`Error in parsing ${configFilePath}: ${(error as Error).message}`);
        }
    }
}
