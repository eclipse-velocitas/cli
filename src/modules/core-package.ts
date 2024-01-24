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

import { homedir } from 'os';

export class CorePackageConfig {
    // ID of the Core package
    coreId: string = '';
    // Uri to the package repository
    corePackageUri: string = '';
    // version of the package to use
    version: string = '';

    constructor(coreId: string, corePackageUri: string) {
        this.coreId = coreId;
        this.corePackageUri = corePackageUri;
        this.version = 'latest';
    }

    getPackageRepo(): string {
        return this.corePackageUri;
    }

    getPackageDirectory(): string {
        // The SDK in path should stay for now because of the long rat tail
        return `${homedir()}/.velocitas/sdk/${this.coreId}`;
    }
}
