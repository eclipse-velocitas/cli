// Copyright (c) 2023 Robert Bosch GmbH
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

export class SdkConfig {
    // name of the package to the package repository
    // @deprecated use repo instead
    repo: string = '';

    // version of the package to use
    version: string = '';

    constructor(language: string) {
        this.repo = language;
        this.version = 'latest';
    }

    getPackageRepo(): string {
        return `https://github.com/eclipse-velocitas/vehicle-app-${this.repo}-sdk`;
    }

    getPackageDirectory(): string {
        return `/home/vscode/.velocitas/sdk/${this.repo}`;
    }
}
