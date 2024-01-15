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

import { readFileSync } from 'fs-extra';
import { DEFAULT_BUFFER_ENCODING } from './constants';

/**
 * Additional argument for exposed interface
 * @interface Parameter
 * @prop {string} id Unique ID of an argument for an exposed interface.
 * @prop {string} description Description of the argument.
 * @prop {string} type Datatype of the argument.
 * @prop {string} [default] Default value of the argument.
 * @prop {boolean} [required] Determines if the argument is required.
 */
export interface Parameter {
    id: string;
    description: string;
    type: string;
    default?: string;
    required?: boolean;
    values?: Value[];
    [key: string]: any;
}

export interface Value {
    id: string;
    description: string;
}

export interface ParameterSet {
    id: string;
    name: string;
    parameters: Parameter[];
}

/**
 * Exposed interface of a package
 * @interface ExposedInterface
 * @prop {string} type Name/ID of the exposed interface.
 * @prop {string} description Description of the exposed interface.
 * @prop {Argument[]} args Additional arguments an exposed interface need.
 */
type ExposedInterface = Core | Extension;

export interface Core {
    id: string;
    type: string;
    name: string;
    description: string;
    parameterSets?: ParameterSet[];
}

export interface Extension {
    id: string;
    type: string;
    name: string;
    description: string;
    compatibleCores: string[];
    parameters?: Parameter[];
}

/**
 * Package index entry. Typing of the package-index.json
 * @interface PackageInterface
 * @prop {string} package URI of the package.
 * @prop {ExposedInterface[]} exposedInterfaces Exposed interfaces of a package.
 */
export interface PackageInterface {
    package: string;
    exposedInterfaces: ExposedInterface[];
}

/**
 * Initialize a new `PackageIndex` with the given package-index content.
 *
 * @param {PackageInterface[]} packages
 * @return {PackageIndex}
 * @public
 */
export class PackageIndex {
    private _packages: PackageInterface[];

    private constructor(packages: PackageInterface[]) {
        this._packages = packages;
    }

    static read(path: string = './package-index.json'): PackageIndex {
        try {
            const packageIndexFile = readFileSync(path, DEFAULT_BUFFER_ENCODING);
            const packageIndex: PackageInterface[] = JSON.parse(packageIndexFile);
            return new PackageIndex(packageIndex);
        } catch (error) {
            throw new Error('No package-index.json found.');
        }
    }

    getCores(): Core[] {
        return this._packages
            .flatMap((pkg: PackageInterface) => pkg.exposedInterfaces)
            .filter((eif: ExposedInterface): eif is Core => eif.type === 'core');
    }

    getExtensions(): Extension[] {
        return this._packages
            .flatMap((pkg: PackageInterface) => pkg.exposedInterfaces)
            .filter((eif: ExposedInterface): eif is Extension => eif.type === 'extension');
    }

    getPackages(): PackageInterface[] {
        const keywordsToCheck = ['core', 'sdk'];
        return this._packages.filter((pkg: PackageInterface) => !keywordsToCheck.some((keyword) => pkg.package.includes(keyword)));
    }

    getExtensionParameters(parameterId: string): Parameter[] | undefined {
        const foundPackage = this._packages.find((pkg: PackageInterface) =>
            pkg.exposedInterfaces.some((eif: ExposedInterface): eif is Extension => eif.id === parameterId),
        );

        let foundExposedInterface: Extension | undefined;

        if (foundPackage) {
            foundExposedInterface = foundPackage.exposedInterfaces.find(
                (eif: ExposedInterface): eif is Extension => eif.id === parameterId,
            );
        }
        return foundExposedInterface?.parameters;
    }
}
