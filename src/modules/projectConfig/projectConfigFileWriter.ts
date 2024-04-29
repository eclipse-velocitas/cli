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
import { mapReplacer } from '../helpers';
import { PackageConfig } from '../package';
import { ProjectConfig } from './projectConfig';
import { DEFAULT_CONFIG_FILE_PATH, DEFAULT_CONFIG_LOCKFILE_PATH } from './projectConfigConstants';

interface IProjectConfigWriter {
    write(projectConfig: ProjectConfig, path: PathLike): void;
}

/**
 * Writer for .velocitas.json files.
 */
export class ProjectConfigWriter implements IProjectConfigWriter {
    /**
     * Creates a string out of the project configuration in format for the lock file.
     * @returns A string for writing the ProjectConfigLock.
     */
    static toLockString(projectConfig: ProjectConfig): string {
        const packagesObject: { [key: string]: string } = {};
        projectConfig.getPackages().forEach((packageConfig: PackageConfig) => {
            packagesObject[`${packageConfig.repo}`] = packageConfig.version;
        });
        const projectConfigAttributes = {
            packages: packagesObject,
        };

        return `${JSON.stringify(projectConfigAttributes, null, 4)}\n`;
    }

    /**
     * Converts an array of PackageConfig objects into a writable Map for the configuration file.
     * @param packageConfig Array of PackageConfig objects.
     * @returns A Map containing repository names as keys and version identifiers as values.
     */
    private _toWritablePackageConfig(packageConfig: PackageConfig[]): Map<string, string> {
        return new Map(packageConfig.map((pkg: PackageConfig) => [pkg.repo, pkg.version]));
    }

    /**
     * Converts an array of ComponentConfig objects into a writable string array for the configuration file.
     * @param componentConfig Array of ComponentConfig objects.
     * @returns A string array containing the IDs of the components.
     */
    private _toWritableComponentConfig(componentConfig: ComponentConfig[]): string[] {
        return Array.from(new Set(componentConfig.map((component: ComponentConfig) => component.id)));
    }

    /**
     * Write the project configuration to file.
     * @param projectConfig Project configuration object to write to a file.
     * @param path Path of the file to write the configuration to.
     */
    write(projectConfig: ProjectConfig, path: PathLike = DEFAULT_CONFIG_FILE_PATH): void {
        // if we find an "old" project configuration with no components explicitly mentioned
        // we persist all components we can find.
        let componentsToSerialize: ComponentConfig[] = projectConfig.getComponents();

        if (!componentsToSerialize || componentsToSerialize.length === 0) {
            componentsToSerialize = projectConfig.getComponentContexts(false, true).map((cc) => cc.config);
        }

        const projectConfigAttributes = {
            packages: this._toWritablePackageConfig(projectConfig.getPackages()),
            components: this._toWritableComponentConfig(componentsToSerialize),
            variables: projectConfig.getVariableMappings(),
            cliVersion: projectConfig.cliVersion,
        };
        const configString = `${JSON.stringify(projectConfigAttributes, mapReplacer, 4)}\n`;
        CliFileSystem.writeFileSync(path, configString);
    }
}

/**
 * Writer for .velocitas-lock.json files.
 */
export class ProjectConfigLockWriter implements IProjectConfigWriter {
    /**
     * Writes the locked project configuration to file.
     * @param projectConfig Project configuration to get the packages for the lock file.
     * @param path Path of the file to write the configuration to. Defaults to DEFAULT_CONFIG_LOCKFILE_PATH.
     */
    write(projectConfig: ProjectConfig, path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): void {
        try {
            CliFileSystem.writeFileSync(path, ProjectConfigWriter.toLockString(projectConfig));
        } catch (error) {
            throw new Error(`Error writing .velocitas-lock.json: ${error}`);
        }
    }
}
