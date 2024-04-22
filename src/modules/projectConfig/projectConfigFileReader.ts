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
import { CliFileSystem } from '../../utils/fs-bridge';
import { ComponentConfig } from '../component';
import { PackageConfig } from '../package';
import { ProjectConfig } from './projectConfig';
import {
    DEFAULT_CONFIG_FILE_PATH,
    DEFAULT_CONFIG_LOCKFILE_PATH,
    DesiredConfigFileComponents,
    DesiredConfigFilePackages,
    DesiredConfigFileVariables,
    VARIABLE_SCOPE_SEPARATOR,
} from './projectConfigConstants';
import { ProjectConfigLock } from './projectConfigLock';

interface IProjectConfigReader {
    read(cliVersion: string, path: PathLike, ignoreLock: boolean): ProjectConfig;
}

export class MultiFormatConfigReader implements IProjectConfigReader {
    /**
     * Checks if a configuration file exists at the given path.
     * @param path The path to the configuration file.
     * @returns True if the configuration file exists, otherwise false.
     */
    static isAvailable = (path: PathLike = DEFAULT_CONFIG_FILE_PATH) => CliFileSystem.existsSync(path);

    /**
     * Reads the project configuration using multiple format readers.
     * @param cliVersion The version of the CLI.
     * @param path The path to the configuration file.
     * @param ignoreLock Whether to ignore the project configuration lock file.
     * @returns The project configuration.
     * @throws Error if unable to read the configuration file in any format.
     */
    static read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH, ignoreLock: boolean = false): ProjectConfig {
        const projectConfigReaders: IProjectConfigReader[] = [new ProjectConfigReader(), new LegacyProjectConfigReader()];

        let config: ProjectConfig | null = null;

        for (const reader of projectConfigReaders) {
            try {
                config = reader.read(cliVersion, path, ignoreLock);
                if (config !== null) {
                    break;
                }
            } catch (e: any) {
                console.warn(`Warning: Reading ${path} using ${reader.constructor.name}: ${e.message}`);
            }
        }

        if (config === null) {
            throw new Error(`Unable to read ${path}: unknown format!`);
        }

        return config;
    }

    read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH, ignoreLock: boolean = false): ProjectConfig {
        return MultiFormatConfigReader.read(cliVersion, path, ignoreLock);
    }
}

/**
 * Reader for .velocitas.json files.
 */
export class ProjectConfigReader implements IProjectConfigReader {
    private _ignoreLock: boolean = false;
    packages: PackageConfig[] = [];
    components: ComponentConfig[] = [];
    variables: Map<string, any> = new Map<string, any>();
    cliVersion: string = '';

    /**
     * Parses configuration variables and assigns them to the given configuration.
     * @param configToAssign Configuration to which the variables will be assigned.
     */
    private _assignVariablesToConfig(configToAssign: PackageConfig | ComponentConfig): void {
        for (const [variableKey, variableValue] of this.variables) {
            if (configToAssign instanceof PackageConfig && variableKey.includes(configToAssign.repo)) {
                const [parsedVariableKey] = variableKey.split(VARIABLE_SCOPE_SEPARATOR);
                configToAssign.variables?.set(parsedVariableKey, variableValue);
            }
            if (configToAssign instanceof ComponentConfig && variableKey.includes(configToAssign.id)) {
                const [parsedVariableKey] = variableKey.split(VARIABLE_SCOPE_SEPARATOR);
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
            if (!ignoreLock && ProjectConfigLockReader.isLockAvailable()) {
                projectConfigLock = ProjectConfigLockReader.read();
            }
            if (projectConfigLock) {
                packageConfig.version = projectConfigLock.findVersion(packageConfig.repo);
            }
        }
    }

    /**
     * Validates the structure of the configuration file packages.
     * @param configFilePackages The configuration file packages to validate.
     * @returns True if the configuration file packages are valid, otherwise false.
     */
    private _isValidConfigFilePackages(configFilePackages: DesiredConfigFilePackages): boolean {
        if (typeof configFilePackages !== 'object' || configFilePackages === null) {
            return false;
        }
        for (const key in configFilePackages) {
            if (typeof key !== 'string' || typeof configFilePackages[key] !== 'string') {
                return false;
            }
        }
        return true;
    }

    /**
     * Validates the structure of the configuration file components.
     * @param configFileComponents The configuration file components to validate.
     * @returns True if the configuration file components are valid, otherwise false.
     */
    private _isValidConfigFileComponents(configFileComponents: DesiredConfigFileComponents): boolean {
        if (!Array.isArray(configFileComponents)) {
            return false;
        }
        for (const component of configFileComponents) {
            if (typeof component !== 'string') {
                return false;
            }
        }
        return true;
    }

    /**
     * Converts DesiredConfigFilePackages into an array of PackageConfig objects.
     * @param configFilePackages Object containing repository names as keys and version numbers as values.
     * @returns An array of PackageConfig objects.
     */
    private _parseConfigToPackageConfigArray(configFilePackages: DesiredConfigFilePackages): PackageConfig[] {
        const pkgCfgArray: PackageConfig[] = [];
        if (!this._isValidConfigFilePackages(configFilePackages)) {
            throw new Error('Config File Packages are not in the expected format');
        }
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
        if (!this._isValidConfigFileComponents(configFileComponents)) {
            throw new Error('Config File Components are not in the expected format');
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

    read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH, ignoreLock: boolean = false): ProjectConfig {
        try {
            const configFileData = JSON.parse(CliFileSystem.readFileSync(path as string));
            this._ignoreLock = ignoreLock;
            this.variables = this._convertConfigFileVariablesToMap(configFileData.variables);
            this.packages = this._parseConfigToPackageConfigArray(configFileData.packages);
            this.components = this._parseConfigToComponentConfigArray(configFileData.components);
            this.cliVersion = configFileData.cliVersion ? configFileData.cliVersion : cliVersion;
            const config = { packages: this.packages, components: this.components, variables: this.variables, cliVersion: this.cliVersion };
            return new ProjectConfig(cliVersion, config);
        } catch (error) {
            throw error;
        }
    }
}

export class LegacyProjectConfigReader implements IProjectConfigReader {
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
     * Converts DesiredConfigFilePackages into an array of PackageConfig objects.
     * @param configFilePackages Object containing repository names as keys and version numbers as values.
     * @returns An array of PackageConfig objects.
     */
    private _parsePackageConfig(packages: PackageConfig[]): PackageConfig[] {
        const configArray: PackageConfig[] = [];
        packages.forEach((packageConfig: PackageConfig) => {
            configArray.push(new PackageConfig(packageConfig));
        });
        return configArray;
    }

    read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH, ignoreLock: boolean = false): ProjectConfig {
        const configFileData = JSON.parse(CliFileSystem.readFileSync(path as string));
        const config = {
            packages: this._parsePackageConfig(configFileData.packages),
            components: configFileData.components,
            variables: this._convertConfigFileVariablesToMap(configFileData.variables),
            cliVersion: configFileData.cliVersion ? configFileData.cliVersion : cliVersion,
        };
        return new ProjectConfig(cliVersion, config);
    }
}

export class ProjectConfigLockReader {
    static isLockAvailable = (path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH) => CliFileSystem.existsSync(path);

    /**
     * Reads the locked project configuration from file.
     * @param path The path to the lock file. Defaults to DEFAULT_CONFIG_LOCKFILE_PATH if not provided.
     * @returns An instance of ProjectConfigLock if the lock file exists and is readable, or null if the file is not present.
     * @throws Error if there's an issue reading the lock file other than it not being present.
     */
    static read(path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): ProjectConfigLock | null {
        try {
            const data = JSON.parse(CliFileSystem.readFileSync(path as string));
            const packages = new Map<string, string>(Object.entries(data.packages));
            return new ProjectConfigLock(packages);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return null;
            } else {
                throw new Error(`Error reading lock file: ${error.message}`);
            }
        }
    }
}
