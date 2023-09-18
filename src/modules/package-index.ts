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

const packagesPattern = /.*\/(.*?)\.git/;
const sdkPattern = /vehicle-app-(.*?)-sdk/;

export interface FunctionalInterfaceDescription {
    name: string;
    value: string;
    args: Argument[];
    default?: boolean;
}

export interface ExampleDescription {
    name: string;
    value: string;
    language: string;
}

export interface Argument {
    id: string;
    description: string;
    type: string;
    default: string;
    required: boolean;
    [key: string]: any;
}

export interface ExposedInterface {
    type: string;
    description: string;
    args: Argument[];
    default?: boolean;
    [key: string]: any;
}

export interface PkgIndexEntry {
    type: string;
    package: string;
    exposedInterfaces: ExposedInterface[];
    [key: string]: any;
}

export class PackageIndex {
    private _packages: PkgIndexEntry[];

    private constructor(packages: PkgIndexEntry[]) {
        this._packages = packages;
    }

    static read(path: string = './package-index.json'): PackageIndex {
        try {
            const packageIndexFile = readFileSync(path, DEFAULT_BUFFER_ENCODING);
            const packageIndex: PkgIndexEntry[] = JSON.parse(packageIndexFile);
            return new PackageIndex(packageIndex);
        } catch (error) {
            throw new Error('No package-index.json found.');
        }
    }

    getCores(): PkgIndexEntry[] {
        return this._packages.filter((pkg: PkgIndexEntry) => pkg.type === 'core');
    }

    getExtensions(): PkgIndexEntry[] {
        return this._packages.filter((pkg: PkgIndexEntry) => pkg.type === 'extension');
    }

    getAvailableLanguages(): string[] {
        const AVAILABLE_LANGUAGES: string[] = [];
        this.getCores().forEach((packageEntry: PkgIndexEntry) => {
            const match = packageEntry.package.match(sdkPattern);
            if (match) {
                const language = match[1];
                AVAILABLE_LANGUAGES.push(language);
            }
        });
        return AVAILABLE_LANGUAGES;
    }

    getAvailableExamples(): ExampleDescription[] {
        const AVAILABLE_EXAMPLES: ExampleDescription[] = [];
        this.getCores().forEach((packageEntry: PkgIndexEntry) => {
            const match = packageEntry.package.match(sdkPattern);
            if (match) {
                const examples = packageEntry.exposedInterfaces.filter((exposed: ExposedInterface) => exposed.type === 'examples');
                for (const example in examples[0].args) {
                    const language = match[1];
                    AVAILABLE_EXAMPLES.push({
                        name: examples[0].args[example].description,
                        value: examples[0].args[example].id,
                        language: language,
                    });
                }
            }
        });
        return AVAILABLE_EXAMPLES;
    }

    getAvailableInterfaces(): FunctionalInterfaceDescription[] {
        const AVAILABLE_INTERFACES: FunctionalInterfaceDescription[] = [];
        this.getExtensions().forEach((packageEntry: PkgIndexEntry) => {
            const match = packageEntry.package.match(packagesPattern);
            if (match) {
                if (packageEntry.exposedInterfaces && Array.isArray(packageEntry.exposedInterfaces)) {
                    packageEntry.exposedInterfaces.forEach((exposedInterface: ExposedInterface) => {
                        if (exposedInterface.type && exposedInterface.description) {
                            AVAILABLE_INTERFACES.push({
                                name: exposedInterface.description,
                                value: exposedInterface.type,
                                args: exposedInterface.args,
                                default: exposedInterface.default,
                            });
                        }
                    });
                }
            }
        });
        return AVAILABLE_INTERFACES;
    }
}
