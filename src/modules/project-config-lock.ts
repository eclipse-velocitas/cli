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
import { ProjectConfig } from './project-config';

const DEFAULT_CONFIG_LOCKFILE_NAME = '.velocitas-lock.json';
const DEFAULT_CONFIG_LOCKFILE_PATH = resolve(cwd(), DEFAULT_CONFIG_LOCKFILE_NAME);

interface ProjectConfigLockAttributes {
    packages: Map<string, string>;
}

export class ProjectConfigLock implements ProjectConfigLockAttributes {
    packages: Map<string, string>;

    constructor(packages: Map<string, string>) {
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

    /**
     * Writes the locked project configuration to file.
     * @param projectConfig Project configuration to get the packages for the lock file.
     * @param path Path of the file to write the configuration to. Defaults to DEFAULT_CONFIG_LOCKFILE_PATH.
     */
    static write(projectConfig: ProjectConfig, path: PathLike = DEFAULT_CONFIG_LOCKFILE_PATH): void {
        try {
            CliFileSystem.writeFileSync(path, projectConfig.toLockString());
        } catch (error) {
            throw new Error(`Error writing .velocitas-lock.json: ${error}`);
        }
    }

    /**
     * Finds the version of the specified package from the lock file.
     * @param packageName Name of the package to find the version for.
     * @returns The version of the specified package if found.
     * @throws Error if no package version is found.
     */
    public findVersion(packageName: string): string {
        const packageVersion = this.packages.get(packageName);
        if (!packageVersion) {
            throw new Error(`Package '${packageName}' not found in lock file.`);
        }
        return packageVersion;
    }
}
