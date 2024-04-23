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

    static read(cliVersion: string, path: PathLike = DEFAULT_CONFIG_FILE_PATH, ignoreLock: boolean = false): ProjectConfig {
        return new MultiFormatConfigReader().read(cliVersion, path, ignoreLock);
    }

    static write(config: ProjectConfig, path: PathLike = DEFAULT_CONFIG_FILE_PATH): void {
        new ProjectConfigWriter().write(config, path);
    }

    static isLockAvailable = (path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): boolean => CliFileSystem.existsSync(path);

    static readLock(path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): ProjectConfigLock | null {
        return new ProjectConfigLockReader().read(path);
    }

    static writeLock(projectConfig: ProjectConfig, path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): void {
        new ProjectConfigLockWriter().write(projectConfig, path);
    }
}
