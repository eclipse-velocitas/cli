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

type DesiredConfigFilePackages = {
    [name: string]: string;
};
type DesiredConfigFileComponents = string[];
type DesiredConfigFileVariables = {
    [name: string]: string;
};
const VARIABLE_SEPARATOR = '@';

/**
 * Parser for .velocitas.json files.
 */
export class ConfigFileParser {
    private _configFileData: any;
    private _ignoreLock: boolean;
    packages: PackageConfig[];
    components: ComponentConfig[];
    variables: Map<string, any>;
    cliVersion: string;

    /**
     * Converts an array of PackageConfig objects into a writable Map for the configuration file.
     * @param packageConfig Array of PackageConfig objects.
     * @returns A Map containing repository names as keys and version numbers as values.
     */
    static toWritablePackageConfig(packageConfig: PackageConfig[]): Map<string, any> {
        return new Map(packageConfig.map((pkg: PackageConfig) => [pkg.repo, pkg.version]));
    }

    /**
     * Converts an array of ComponentConfig objects into a writable string array for the configuration file.
     * @param componentConfig Array of ComponentConfig objects.
     * @returns A string array containing the IDs of the components.
     */
    static toWritableComponentConfig(componentConfig: ComponentConfig[]): DesiredConfigFileComponents {
        return Array.from(new Set(componentConfig.map((component: ComponentConfig) => component.id)));
    }

    /**
     * Parses configuration variables and assigns them to the given configuration.
     * @param configToAssign Configuration to which the variables will be assigned.
     */
    private _assignVariablesToConfig(configToAssign: PackageConfig | ComponentConfig): void {
        for (const [variableKey, variableValue] of this.variables) {
            if (configToAssign instanceof PackageConfig && variableKey.includes(configToAssign.repo)) {
                const [parsedVariableKey] = variableKey.split(VARIABLE_SEPARATOR);
                configToAssign.variables?.set(parsedVariableKey, variableValue);
            }
            if (configToAssign instanceof ComponentConfig && variableKey.includes(configToAssign.id)) {
                const [parsedVariableKey] = variableKey.split(VARIABLE_SEPARATOR);
                configToAssign.variables?.set(parsedVariableKey, variableValue);
            }
        }
    }

    /**
     * Converts DesiredConfigFileVariables into a Map format.
     * @param configFileVariables Configuration file variables to convert.
     * @returns A Map representing the configuration file variables.
     */
    private _convertConfigFileVariablesToMap(configFileVariables: DesiredConfigFileVariables): Map<string, any> {
        if (!configFileVariables) {
            return new Map<string, any>();
        }
        if (!(configFileVariables instanceof Map)) {
            return new Map<string, any>(Object.entries(configFileVariables));
        }
        return new Map<string, any>();
    }

    /**
     * Processes all packageConfigs to assign variables and read versions from lock file.
     * @param ignoreLock If true, ignores project configuration lock file.
     */
    private _handlePackages(ignoreLock: boolean): void {
        let projectConfigLock: ProjectConfigLock | null = null;

        for (let packageConfig of this.packages) {
            this._assignVariablesToConfig(packageConfig);
            if (!ignoreLock && ProjectConfigLock.isAvailable()) {
                projectConfigLock = ProjectConfigLock.read();
            }
            if (projectConfigLock) {
                packageConfig.version = projectConfigLock.findVersion(packageConfig.repo);
            }
        }
    }

    /**
     * Converts DesiredConfigFilePackages into an array of PackageConfig objects.
     * @param configFilePackages Object containing repository names as keys and version numbers as values.
     * @returns An array of PackageConfig objects.
     */
    private _parseConfigToPackageConfigArray(configFilePackages: DesiredConfigFilePackages): PackageConfig[] {
        const pkgCfgArray: PackageConfig[] = [];
        const packages = configFilePackages instanceof Map ? configFilePackages : new Map(Object.entries(configFilePackages));

        for (const [repoName, version] of packages) {
            const pkgCfg = new PackageConfig({ repo: repoName, version: version });
            this._assignVariablesToConfig(pkgCfg);
            pkgCfgArray.push(pkgCfg);
        }
        this.packages = pkgCfgArray;
        this._handlePackages(this._ignoreLock);
        return pkgCfgArray;
    }

    /**
     * Converts DesiredConfigFileComponents into an array of ComponentConfig objects.
     * @param configFileComponents String array of component IDs.
     * @returns An array of ComponentConfig objects.
     */
    private _parseConfigToComponentConfigArray(configFileComponents: DesiredConfigFileComponents): ComponentConfig[] {
        if (!configFileComponents) {
            return [];
        }

        const cmpCfgArray: ComponentConfig[] = configFileComponents.map((component: string) => {
            const cmpCfg = new ComponentConfig(component);
            if (this.variables) {
                this._assignVariablesToConfig(cmpCfg);
            }
            return cmpCfg;
        });
        return cmpCfgArray;
    }

    constructor(configFilePath: PathLike, ignoreLock: boolean) {
        try {
            this._configFileData = JSON.parse(CliFileSystem.readFileSync(configFilePath as string));
            this._ignoreLock = ignoreLock;
            this.variables = this._convertConfigFileVariablesToMap(this._configFileData.variables);
            this.packages = this._parseConfigToPackageConfigArray(this._configFileData.packages);
            this.components = this._parseConfigToComponentConfigArray(this._configFileData.components);
            this.cliVersion = this._configFileData.cliVersion ? this._configFileData.cliVersion : '';
        } catch (error) {
            throw new Error(`Error in parsing ${configFilePath}: ${error}`);
        }
    }
}
