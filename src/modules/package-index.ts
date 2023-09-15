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

import { readFileSync } from 'fs-extra';
import { DEFAULT_BUFFER_ENCODING } from './constants';

export interface Parameter {
    id: string;
    prompt: string;
    type: string;
}

export interface ComponentEntry {
    id: string;
    description: string;
    type: string;
    supportedCores?: string[];
    parameters: Parameter[];
}

export interface PkgIndexEntry {
    package: string;
    components: ComponentEntry[];
}

export class PackageIndex {
    private _packages: PkgIndexEntry[];

    private constructor(packages: PkgIndexEntry[]) {
        this._packages = packages;
    }

    static read(path: string = './package-index.json'): PackageIndex {
        const packageIndexFile = readFileSync(path, DEFAULT_BUFFER_ENCODING);
        const packageIndex: PkgIndexEntry[] = JSON.parse(packageIndexFile);
        return new PackageIndex(packageIndex);
    }

    getCores(): ComponentEntry[] {
        return this._packages.flatMap((pkg) => pkg.components).filter((comp) => comp.type === 'core');
    }

    getExtensions(): ComponentEntry[] {
        return this._packages.flatMap((pkg) => pkg.components).filter((comp) => comp.type === 'extension');
    }
}
