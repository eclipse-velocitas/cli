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
import { ProjectConfig } from './projectConfig';
import { DEFAULT_CONFIG_FILE_PATH, DEFAULT_CONFIG_LOCKFILE_PATH } from './projectConfigConstants';
import { MultiFormatConfigReader, ProjectConfigLockReader } from './projectConfigFileReader';
import { ProjectConfigLockWriter, ProjectConfigWriter } from './projectConfigFileWriter';
import { ProjectConfigLock } from './projectConfigLock';

export class ProjectConfigIO {
    /**
     * Checks if a configuration file exists at the given path.
     * @param path The path to the configuration file.
     * @returns True if the configuration file exists, otherwise false.
     */
    static isConfigAvailable = (path: PathLike = DEFAULT_CONFIG_FILE_PATH): boolean => CliFileSystem.existsSync(path);

    /**
     * Reads the project configuration using readers for multiple formats.
     * @param cliVersion The version of the CLI.
     * @param path The path to the configuration file.
     * @param ignoreLock Whether to ignore the project configuration lock file or not.
     * @returns The project configuration.
     * @throws Error if unable to read the configuration file in any format.
     */
    static read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH, ignoreLock: boolean = false): ProjectConfig {
        return new MultiFormatConfigReader().read(cliVersion, path, ignoreLock);
    }

    /**
     * Write the project configuration to file.
     * @param projectConfig Project configuration object to write to a file.
     * @param path Path of the file to write the configuration to.
     */
    static write(config: ProjectConfig, path: PathLike = DEFAULT_CONFIG_FILE_PATH): void {
        new ProjectConfigWriter().write(config, path);
    }

    /**
     * Checks if a locked configuration file exists at the given path.
     * @param path The path to the configuration file.
     * @returns True if the configuration file exists, otherwise false.
     */
    static isLockAvailable = (path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): boolean => CliFileSystem.existsSync(path);

    /**
     * Reads the locked project configuration from file.
     * @param path The path to the lock file. Defaults to DEFAULT_CONFIG_LOCKFILE_PATH if not provided.
     * @returns An instance of ProjectConfigLock if the lock file exists and is readable, or null if the file is not present.
     * @throws Error if there's an issue reading the lock file other than it not being present.
     */
    static readLock(path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): ProjectConfigLock | null {
        return new ProjectConfigLockReader().read(path);
    }

    /**
     * Writes the locked project configuration to file.
     * @param projectConfig Project configuration to get the packages for the lock file.
     * @param path Path of the file to write the configuration to. Defaults to DEFAULT_CONFIG_LOCKFILE_PATH.
     */
    static writeLock(projectConfig: ProjectConfig, path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): void {
        new ProjectConfigLockWriter().write(projectConfig, path);
    }
}
