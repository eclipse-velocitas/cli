// Copyright (c) 2024-2025 Contributors to the Eclipse Foundation
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
import { ProjectConfig, ProjectConfigAttributes } from './projectConfig';
import {
    DEFAULT_CONFIG_FILE_PATH,
    DEFAULT_CONFIG_LOCKFILE_PATH,
    DesiredConfigFileComponents,
    DesiredConfigFilePackages,
    VARIABLE_SCOPE_SEPARATOR,
} from './projectConfigConstants';
import { ProjectConfigLock } from './projectConfigLock';
import { ReaderUtil } from './readerUtil';

interface IProjectConfigReader {
    read(cliVersion: string, path: PathLike, ignoreLock: boolean): ProjectConfig;
}

export class MultiFormatConfigReader implements IProjectConfigReader {
    /**
     * Reads the project configuration using readers for multiple formats.
     * @param cliVersion The version of the CLI.
     * @param path The path to the configuration file.
     * @param ignoreLock Whether to ignore the project configuration lock file or not.
     * @returns The project configuration.
     * @throws Error if unable to read the configuration file in any format.
     */
    read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH, ignoreLock: boolean = false): ProjectConfig {
        const projectConfigReaders: IProjectConfigReader[] = [new ProjectConfigReader(), new LegacyProjectConfigReader()];

        let config: ProjectConfig | null = null;

        for (const reader of projectConfigReaders) {
            try {
                config = reader.read(cliVersion, path, ignoreLock);
                if (config !== null) {
                    break;
                }
            } catch (error: any) {
                console.warn(`Warning: ${path} not in expected format: ${error.message}, falling back to legacy format reading.`);
            }
        }

        if (config === null) {
            throw new Error(`Unable to read ${path}: unknown format!`);
        }

        return config;
    }
}

/**
 * Reader for .velocitas.json files.
 */
export class ProjectConfigReader implements IProjectConfigReader {
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
            if (
                (configToAssign instanceof PackageConfig && variableKey.includes(configToAssign.repo)) ||
                (configToAssign instanceof ComponentConfig && variableKey.includes(configToAssign.id))
            ) {
                const [parsedVariableKey] = variableKey.split(VARIABLE_SCOPE_SEPARATOR);
                configToAssign.variables?.set(parsedVariableKey, variableValue);
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
     * @param configFilePackages Object containing repository names as keys and version strings as values.
     * @param ignoreLock If true, ignores project configuration lock file.
     * @returns An array of PackageConfig objects.
     */
    private _parseConfigToPackageConfigArray(configFilePackages: DesiredConfigFilePackages, ignoreLock: boolean): PackageConfig[] {
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
        ReaderUtil.parseLockFileVersions(pkgCfgArray, ignoreLock);
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

    /**
     * Reads the project configuration.
     * @param cliVersion The version of the CLI.
     * @param path The path to the configuration file.
     * @param ignoreLock Whether to ignore the project configuration lock file or not.
     * @returns The project configuration.
     * @throws Error if unable to read the configuration file in any format.
     */
    read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH, ignoreLock: boolean = false): ProjectConfig {
        try {
            const configFileData = JSON.parse(CliFileSystem.readFileSync(path as string));
            this.variables = ReaderUtil.convertConfigFileVariablesToMap(configFileData.variables);
            this.packages = this._parseConfigToPackageConfigArray(configFileData.packages, ignoreLock);
            this.components = this._parseConfigToComponentConfigArray(configFileData.components);
            this.cliVersion = configFileData.cliVersion ? configFileData.cliVersion : cliVersion;
            const config: ProjectConfigAttributes = {
                packages: this.packages,
                components: this.components,
                variables: this.variables,
                cliVersion: this.cliVersion,
            };
            return new ProjectConfig(cliVersion, config);
        } catch (error) {
            throw error;
        }
    }
}

/**
 * Reader for legacy .velocitas.json files in old format.
 */
export class LegacyProjectConfigReader implements IProjectConfigReader {
    /**
     * Parses legacy package configurations into an array of PackageConfig objects.
     * @param configFilePackages Array containing configuration for packages.
     * @param ignoreLock If true, ignores project configuration lock file.
     * @returns An array of PackageConfig objects.
     */
    private _parseLegacyPackageConfig(configFilePackages: PackageConfig[], ignoreLock: boolean): PackageConfig[] {
        const configArray: PackageConfig[] = [];
        ReaderUtil.parseLockFileVersions(configFilePackages, ignoreLock);
        configFilePackages.forEach((packageConfig: PackageConfig) => {
            packageConfig.variables = ReaderUtil.convertConfigFileVariablesToMap(packageConfig.variables);
            configArray.push(new PackageConfig(packageConfig));
        });
        return configArray;
    }

    /**
     * Parses legacy component configurations into an array of ComponentConfig objects.
     * @param configFileComponents Array containing configuration for components.
     * @returns An array of ComponentConfig objects.
     */
    private _parseLegacyComponentConfig(configFileComponents: ComponentConfig[]): ComponentConfig[] {
        const configArray: ComponentConfig[] = [];
        if (!configFileComponents) {
            return configArray;
        }
        configFileComponents.forEach((componentConfig: ComponentConfig) => {
            const cmpCfg = new ComponentConfig(componentConfig.id);
            cmpCfg.variables = ReaderUtil.convertConfigFileVariablesToMap(componentConfig.variables);
            configArray.push(cmpCfg);
        });
        return configArray;
    }

    /**
     * Reads the legacy project configuration in old format.
     * @param cliVersion The version of the CLI.
     * @param path The path to the configuration file.
     * @param ignoreLock Whether to ignore the project configuration lock file or not.
     * @returns The project configuration.
     * @throws Error if unable to read the configuration file in any format.
     */
    read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH, ignoreLock: boolean = false): ProjectConfig {
        const configFileData = JSON.parse(CliFileSystem.readFileSync(path as string));
        const config: ProjectConfigAttributes = {
            packages: this._parseLegacyPackageConfig(configFileData.packages, ignoreLock),
            components: this._parseLegacyComponentConfig(configFileData.components),
            variables: ReaderUtil.convertConfigFileVariablesToMap(configFileData.variables),
            cliVersion: configFileData.cliVersion ? configFileData.cliVersion : cliVersion,
        };
        return new ProjectConfig(cliVersion, config);
    }
}

/**
 * Reader for .velocitas-lock.json files.
 */
export class ProjectConfigLockReader {
    /**
     * Reads the locked project configuration from file.
     * @param path The path to the lock file. Defaults to DEFAULT_CONFIG_LOCKFILE_PATH if not provided.
     * @returns An instance of ProjectConfigLock if the lock file exists and is readable, or null if the file is not present.
     * @throws Error if there's an issue reading the lock file other than it not being present.
     */
    read(path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): ProjectConfigLock | null {
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
