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

import { readFileSync } from 'fs-extra';
import { DEFAULT_BUFFER_ENCODING } from './constants';

/**
 * Additional argument for exposed interface
 * @interface Parameter
 * @prop {string} id - Unique ID of an argument for an exposed interface.
 * @prop {string} description - Description of the argument.
 * @prop {string} type - Datatype of the argument.
 * @prop {string} [default] - Default value of the argument.
 * @prop {boolean} [required] - Determines if the argument is required.
 * @prop {Value[]} [values] - Array of possible values for the argument.
 * @prop {any} [key] - Additional properties not defined in the interface.
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

/**
 * Represents a value with an ID and a description.
 * @interface Value
 * @prop {string} id - Unique ID of the value.
 * @prop {string} description - Description of the value.
 */
export interface Value {
    id: string;
    description: string;
}

/**
 * Represents a set of parameters with an ID, name, and an array of parameters.
 * @interface ParameterSet
 * @prop {string} id - Unique ID of the parameter set.
 * @prop {string} name - Name of the parameter set.
 * @prop {Parameter[]} parameters - Array of parameters in the set.
 */
export interface ParameterSet {
    id: string;
    name: string;
    parameters: Parameter[];
}

/**
 * Exposed interface of a package, which can be either a Core or an Extension.
 * @interface ExposedInterface
 * @prop {string} type - Type (Name/ID) of the exposed interface.
 * @prop {string} description - Description of the exposed interface.
 * @prop {Core | Extension} args - Additional arguments an exposed interface needs.
 */
type ExposedInterface = Core | Extension;

/**
 * Represents the core part of an exposed interface with an ID, type, name, description, and optional parameter sets.
 * @interface Core
 * @prop {string} id - Unique ID of the core.
 * @prop {string} type - Type of the core.
 * @prop {string} name - Name of the core.
 * @prop {string} description - Description of the core.
 * @prop {ParameterSet[]} [parameterSets] - Array of parameter sets.
 */
export interface Core {
    id: string;
    type: string;
    name: string;
    description: string;
    parameterSets?: ParameterSet[];
}

/**
 * Represents the extension part of an exposed interface with an ID, type, name, description, compatible cores, and optional parameters.
 * @interface Extension
 * @prop {string} id - Unique ID of the extension.
 * @prop {string} type - Type of the extension.
 * @prop {string} name - Name of the extension.
 * @prop {string} description - Description of the extension.
 * @prop {string[]} compatibleCores - Array of compatible core types.
 * @prop {Parameter[]} [parameters] - Array of parameters.
 */
export interface Extension {
    id: string;
    type: string;
    name: string;
    description: string;
    compatibleCores: string[];
    parameters?: Parameter[];
}

/**
 * Package index entry. Typing of the package-index.json.
 * @interface PackageInterface
 * @prop {string} package - URI of the package.
 * @prop {ExposedInterface[]} exposedInterfaces - Exposed interfaces of a package.
 */
export interface PackageInterface {
    package: string;
    exposedInterfaces: ExposedInterface[];
}

/**
 * Represents a package index with an array of package entries.
 * @class PackageIndex
 * @public
 */
export class PackageIndex {
    private _packages: PackageInterface[];

    /**
     * Creates a new `PackageIndex` with the given package-index content.
     * @constructor
     * @param {PackageInterface[]} packages - Array of package entries.
     * @private
     */
    private constructor(packages: PackageInterface[]) {
        this._packages = packages;
    }

    /**
     * Reads a `PackageIndex` from the specified file path (default is './package-index.json').
     * @param {string} path - Path to the package index file.
     * @returns {PackageIndex} - The created PackageIndex instance.
     * @throws {Error} - Throws an error if the package-index.json file is not found.
     * @static
     * @public
     */
    static read(path: string = './package-index.json'): PackageIndex {
        try {
            const packageIndexFile = readFileSync(path, DEFAULT_BUFFER_ENCODING);
            const packageIndex: PackageInterface[] = JSON.parse(packageIndexFile);
            return new PackageIndex(packageIndex);
        } catch (error) {
            throw new Error('No package-index.json found.');
        }
    }

    /**
     * Gets an array of Core instances from the package index.
     * @returns {Core[]} - Array of Core instances.
     * @public
     */
    getCores(): Core[] {
        return this._packages
            .flatMap((pkg: PackageInterface) => pkg.exposedInterfaces)
            .filter((eif: ExposedInterface): eif is Core => eif.type === 'core');
    }

    /**
     * Gets an array of Extension instances from the package index.
     * @returns {Extension[]} - Array of Extension instances.
     * @public
     */
    getExtensions(): Extension[] {
        return this._packages
            .flatMap((pkg: PackageInterface) => pkg.exposedInterfaces)
            .filter((eif: ExposedInterface): eif is Extension => eif.type === 'extension');
    }

    /**
     * Gets an array of PackageInterface instances excluding those with specified keywords in their URIs.
     * @returns {PackageInterface[]} - Array of PackageInterface instances.
     * @public
     */
    getPackages(): PackageInterface[] {
        const keywordsToCheck = ['core', 'sdk'];
        try {
            return this._packages.filter((pkg: PackageInterface) => !keywordsToCheck.some((keyword) => pkg.package.includes(keyword)));
        } catch (error) {
            return [];
        }
    }

    /**
     * Gets the parameters of an extension by parameter ID.
     * @param {string} parameterId - ID of the parameter to search for.
     * @returns {Parameter[] | undefined} - Array of parameters if found, undefined otherwise.
     * @public
     */
    getExtensionParametersByParameterId(parameterId: string): Parameter[] | undefined {
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
