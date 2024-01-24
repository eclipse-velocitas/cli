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
    values?: DescribedValue[];
    [key: string]: any;
}

/**
 * Represents a value with an ID and a description.
 * @interface Value
 * @prop {string} id - Unique ID of the value.
 * @prop {string} description - Description of the value.
 */
export interface DescribedValue {
    id: string;
    description: string;
}

/**
 * Represents options  of a core package with an ID, name and an array of parameters.
 * @interface CoreOptions
 * @prop {string} id - Unique ID of the core option.
 * @prop {string} name - Name of the core option.
 * @prop {Parameter[]} parameters - Array of parameters of the option.
 */
export interface CoreOptions {
    id: string;
    name: string;
    parameters: Parameter[];
}

/**
 * Base interface for an exposed interface of a package.
 * @interface ComponentBase
 * @prop {string} id - Unique ID of the exposed interface.
 * @prop {string} type - Type of the exposed interface.
 * @prop {string} name - Name of the exposed interface.
 * @prop {string} description - Description of the exposed interface.
 */
interface ComponentBase {
    id: string;
    type: string;
    name: string;
    description: string;
    mandatory: boolean;
}
/**
 * Represents a core package with an ID, type, name, description and optional options.
 * @interface Core
 * @prop {CoreOptions[]} [options] - Array of options of a core package.
 */
export interface Core extends ComponentBase {
    options?: CoreOptions[];
}

/**
 * Represents an extension package with an ID, type, name, description, compatible cores, and optional parameters.
 * @interface Extension
 * @prop {string[]} compatibleCores - Array of compatible core types.
 * @prop {Parameter[]} [parameters] - Array of parameters.
 */
export interface Extension extends ComponentBase {
    compatibleCores: string[];
    parameters?: Parameter[];
}

/**
 * Package index entry. Typing of the package-index.json.
 * @interface PackageInterface
 * @prop {string} package - URI of the package.
 * @prop {ExposedInterface[]} exposedInterfaces - Exposed interfaces of a package.
 */
export interface PackageAttributes {
    package: string;
    components: Core[] | Extension[];
}

/**
 * Represents a package index with an array of package entries.
 * @class PackageIndex
 * @public
 */
export class PackageIndex {
    private _packages: PackageAttributes[];

    /**
     * Creates a new `PackageIndex` with the given package-index content.
     * @constructor
     * @param {PackageAttributes[]} packages - Array of package entries.
     * @private
     */
    private constructor(packages: PackageAttributes[]) {
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
            const packageIndex: PackageAttributes[] = JSON.parse(packageIndexFile);
            return new PackageIndex(packageIndex);
        } catch (error) {
            throw new Error('No package-index.json found.');
        }
    }

    /**
     * Gets an array of exposed interfaces (Cores or Extensions) from the package index.
     * @returns {(Core | Extension)[]} - Array of Core or Extension instances.
     * @private
     */
    private _getComponents(): (Core | Extension)[] {
        return this._packages.flatMap((pkg: PackageAttributes) => pkg.components);
    }

    /**
     * Gets an array of Core instances from the package index.
     * @returns {Core[]} - Array of Core instances.
     * @public
     */
    getCores(): Core[] {
        return this._getComponents().filter((component: Core | Extension): component is Core => component.type === 'core');
    }

    /**
     * Gets an array of Extension instances from the package index.
     * @returns {Extension[]} - Array of Extension instances.
     * @public
     */
    getExtensions(): Extension[] {
        return this._getComponents().filter((component: Core | Extension): component is Extension => component.type === 'extension');
    }

    /**
     * Gets an array of all mandatory Packages.
     * @returns {PackageAttributes[]} - Array of PackageInterface instances.
     * @public
     */
    getMandatoryPackages(): PackageAttributes[] {
        return this._packages.filter((pkg: PackageAttributes) => pkg.components.some((component: Core | Extension) => component.mandatory));
    }

    /**
     * Gets the parameters of an extension by parameter ID.
     * @param {string} parameterId - ID of the parameter to search for.
     * @returns {Parameter[] | undefined} - Array of parameters if found, undefined otherwise.
     * @public
     */
    getPackageByComponentId(componentId: string): PackageAttributes {
        return this._packages.find((pkg: PackageAttributes) =>
            pkg.components.some((component: Core | Extension) => component.id === componentId),
        )!;
    }

    /**
     * Gets the parameters of an extension by parameter ID.
     * @param {string} parameterId - ID of the parameter to search for.
     * @returns {Parameter[] | undefined} - Array of parameters if found, undefined otherwise.
     * @public
     */
    getExtensionParametersByParameterId(parameterId: string): Parameter[] | undefined {
        const foundPackage = this._packages.find((pkg: PackageAttributes) =>
            pkg.components.some((component: Core | Extension): component is Extension => component.id === parameterId),
        );

        let foundExposedInterface: Extension | undefined;

        if (foundPackage) {
            const components = foundPackage.components as (Core | Extension)[];
            foundExposedInterface = components.find((component: Core | Extension): component is Extension => component.id === parameterId);
        }
        return foundExposedInterface?.parameters;
    }
}
