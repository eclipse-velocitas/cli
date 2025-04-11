// Copyright (c) 2022-2025 Contributors to the Eclipse Foundation
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

import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { CliFileSystem } from '../utils/fs-bridge';

export const DEFAULT_APP_MANIFEST_PATH = './app/AppManifest.json';
export const APP_MANIFEST_PATH_VARIABLE = 'appManifestPath';
const APP_MANIFEST_PATH = resolve(cwd(), DEFAULT_APP_MANIFEST_PATH);

/**
 * Interface config entry for AppManifest
 * @interface AppManifestInterfaceAttributes
 * @prop {string} type - Type of the App interface.
 * @prop {Record<string, any>} config - Config object specific for the interface type.
 */
export interface AppManifestInterfaceAttributes {
    type: string;
    config: Record<string, any>;
}

/**
 * Represents an AppManifest for a Vehicle App.
 * @interface AppManifestAttributes
 * @prop {string} manifestVersion - Version of the AppManifest format.
 * @prop {string} name - Name of the Vehicle App.
 * @prop {AppManifestInterfaceAttributes[]} interfaces - List of interface entries in the AppManifest.
 */
export interface AppManifestAttributes {
    manifestVersion: string;
    name: string;
    interfaces: AppManifestInterfaceAttributes[];
}

/**
 * Represents an AppManifest for a Vehicle App.
 * @class
 * @implements {AppManifest}
 */
export class AppManifest implements AppManifestAttributes {
    manifestVersion: string = 'v3';
    name: string;
    interfaces: AppManifestInterfaceAttributes[] = [];

    /**
     * Creates an instance of AppManifest.
     * @param {string} name - Name of the Vehicle App.
     * @param {AppManifestInterfaceAttributes[]} [interfaces=[]] - List of interface entries in the AppManifest.
     */
    constructor(name: string, interfaces: AppManifestInterfaceAttributes[] = []) {
        this.name = name;
        this.interfaces = this._createInterfaceEntries(interfaces);
    }

    /**
     * Creates interface entries for the AppManifest.
     * @private
     * @param {AppManifestInterfaceAttributes[]} interfaces - List of interface entries to process.
     * @returns {AppManifestInterfaceAttributes[]} Processed interface entries with parsed JSON values.
     */
    private _createInterfaceEntries(interfaces: AppManifestInterfaceAttributes[]): AppManifestInterfaceAttributes[] {
        return interfaces.map((entry: AppManifestInterfaceAttributes) => ({
            type: entry.type,
            config: Object.fromEntries(
                Object.entries(entry.config).map(([key, value]) => {
                    try {
                        return [key, JSON.parse(value)];
                    } catch {
                        return [key, value];
                    }
                }),
            ),
        }));
    }

    /**
     * Reads an AppManifest from a file.
     * @static
     * @param {string} [appManifestPath=APP_MANIFEST_PATH] - Path to the AppManifest file.
     * @returns {AppManifest|undefined} The AppManifest or undefined if the file doesn't exist.
     * @throws {Error} Throws an error if there is an issue reading the AppManifest file.
     */
    static read(appManifestPath: string = APP_MANIFEST_PATH): AppManifest | undefined {
        if (!CliFileSystem.existsSync(appManifestPath)) {
            console.info('*** Info ***: No AppManifest found');
            return undefined;
        }
        try {
            const file = CliFileSystem.readFileSync(appManifestPath);
            const manifest = JSON.parse(file);
            if (Array.isArray(manifest)) {
                // for backwards compatibility, use the first entry from the array
                return manifest[0];
            }
            return manifest;
        } catch (error) {
            console.error(`Unable to read App Manifest: '${error}'`);
            throw error;
        }
    }

    write() {
        CliFileSystem.outputFileSync(DEFAULT_APP_MANIFEST_PATH, JSON.stringify(this, null, 4));
    }
}
