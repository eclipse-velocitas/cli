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

import { PackageConfig } from '../package';
import { DesiredConfigFileVariables } from './projectConfigConstants';
import { ProjectConfigIO } from './projectConfigIO';
import { ProjectConfigLock } from './projectConfigLock';

export namespace ReaderUtil {
    /**
     * Converts DesiredConfigFileVariables into a Map format.
     * @param configFileVariables Configuration file variables to convert.
     * @returns A Map representing the configuration file variables.
     */
    export function convertConfigFileVariablesToMap(configFileVariables: DesiredConfigFileVariables): Map<string, any> {
        if (!configFileVariables) {
            return new Map<string, any>();
        }
        if (!(configFileVariables instanceof Map)) {
            return new Map<string, any>(Object.entries(configFileVariables));
        }
        return new Map<string, any>();
    }

    /**
     * Processes all packageConfigs to read versions from lock file.
     * @param packageConfigs Package Configurations to process.
     * @param ignoreLock If true, ignores project configuration lock file.
     */
    export function parseLockFileVersions(packageConfigs: PackageConfig[], ignoreLock: boolean): PackageConfig[] {
        let projectConfigLock: ProjectConfigLock | null = null;
        if (!ignoreLock && ProjectConfigIO.isLockAvailable()) {
            projectConfigLock = ProjectConfigIO.readLock();
        }
        if (projectConfigLock) {
            for (let packageConfig of packageConfigs) {
                packageConfig.version = projectConfigLock.findVersion(packageConfig.repo);
            }
        }
        return packageConfigs;
    }
}
