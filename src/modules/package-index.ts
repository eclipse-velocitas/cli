// Copyright (c) 2023 Contributors to the Eclipse Foundation
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

// Copyright (c) 2023 Contributors to the Eclipse Foundationhe Eclipse Foundation
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

/**
 * Functional interface description to be used for inquirer prompt
 * @interface FunctionalInterfaceDescription
 * @prop {string} name Actual description shown in the inquirer prompt.
 * @prop {string} value Value of the functional interface.
 * @prop {Argument[]} args Additional arguments to be prompted.
 */
export interface FunctionalInterfaceDescription {
    name: string;
    value: string;
    args: Argument[];
}

/**
 * Example description to be used for inquirer prompt
 * @interface ExampleDescription
 * @prop {string} name Actual description shown in the inquirer prompt.
 * @prop {string} value Value of the example.
 * @prop {string} language Programming language the example is available.
 */
export interface ExampleDescription {
    name: string;
    value: string;
    language: string;
}

/**
 * Additional argument for exposed interface
 * @interface Argument
 * @prop {string} id Unique ID of an argument for an exposed interface.
 * @prop {string} description Description of the argument.
 * @prop {string} type Datatype of the argument.
 * @prop {string} [default] Default value of the argument.
 * @prop {boolean} [required] Determines if the argument is required.
 */
export interface Argument {
    id: string;
    description: string;
    type: string;
    default?: string;
    required?: boolean;
    [key: string]: any;
}

/**
 * Exposed interface of a package
 * @interface ExposedInterface
 * @prop {string} type Name/ID of the exposed interface.
 * @prop {string} description Description of the exposed interface.
 * @prop {Argument[]} args Additional arguments an exposed interface need.
 * @prop {boolean} [default] Determines if the exposed interface is used as default.
 */
export interface ExposedInterface {
    type: string;
    description: string;
    args: Argument[];
    default?: boolean;
    [key: string]: any;
}

/**
 * Package index entry. Typing of the package-index.json
 * @interface PkgIndexEntry
 * @prop {string} type Type of the package.
 * @prop {string} package URI of the package.
 * @prop {ExposedInterface[]} exposedInterfaces Exposed interfaces of a package.
 */
export interface PkgIndexEntry {
    type: string;
    package: string;
    exposedInterfaces: ExposedInterface[];
    [key: string]: any;
}

/**
 * Initialize a new `PackageIndex` with the given package-index content.
 *
 * @param {PkgIndexEntry[]} packages
 * @return {PackageIndex}
 * @public
 */
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
        const availableLanguages: string[] = [];
        this.getCores().forEach((packageEntry: PkgIndexEntry) => {
            const match = packageEntry.package.match(sdkPattern);
            if (match) {
                const language = match[1];
                availableLanguages.push(language);
            }
        });
        return availableLanguages;
    }

    getAvailableExamples(): ExampleDescription[] {
        const availableExamples: ExampleDescription[] = [];
        this.getCores().forEach((packageEntry: PkgIndexEntry) => {
            const match = packageEntry.package.match(sdkPattern);
            if (!match) {
                return [];
            }
            const examples = packageEntry.exposedInterfaces.filter((exposed: ExposedInterface) => exposed.type === 'examples');
            if (!examples.length) {
                return [];
            }
            for (const example in examples[0].args) {
                const language = match[1];
                availableExamples.push({
                    name: examples[0].args[example].description,
                    value: examples[0].args[example].id,
                    language: language,
                });
            }
        });
        return availableExamples;
    }

    getAvailableInterfaces(): FunctionalInterfaceDescription[] {
        const availableInterfaces: FunctionalInterfaceDescription[] = [];
        this.getExtensions().forEach((packageEntry: PkgIndexEntry) => {
            const match = packageEntry.package.match(packagesPattern);
            if (match) {
                if (packageEntry.exposedInterfaces && Array.isArray(packageEntry.exposedInterfaces)) {
                    packageEntry.exposedInterfaces.forEach((exposedInterface: ExposedInterface) => {
                        if (exposedInterface.type && exposedInterface.description) {
                            availableInterfaces.push({
                                name: exposedInterface.description,
                                value: exposedInterface.type,
                                args: exposedInterface.args,
                            });
                        }
                    });
                }
            }
        });
        return availableInterfaces;
    }
}
