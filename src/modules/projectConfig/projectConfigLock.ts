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

interface ProjectConfigLockAttributes {
    packages: Map<string, string>;
}

export class ProjectConfigLock implements ProjectConfigLockAttributes {
    packages: Map<string, string>;

    constructor(packages: Map<string, string>) {
        this.packages = packages;
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
