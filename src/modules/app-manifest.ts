// Copyright (c) 2022-2023 Contributors to the Eclipse Foundation
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

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { DEFAULT_BUFFER_ENCODING } from './constants';
import { outputFileSync } from 'fs-extra';

export const DEFAULT_APP_MANIFEST_PATH = './app/AppManifest.json';
const APP_MANIFEST_PATH = resolve(cwd(), DEFAULT_APP_MANIFEST_PATH);

/**
 * Interface config entry for AppManifest
 * @interface AppManifestInterfaces
 * @prop {string} type Type of the App interface.
 * @prop {any} config Config object specific for interface type.
 */
export interface AppManifestInterfaceEntry {
    type: string;
    config: {
        [key: string]: any;
    };
}
/**
 * Interface config for AppManifest
 * @interface AppManifestInterfaces
 * @prop {AppManifestInterfaceEntry[]} interfaces Array of AppManifest interface config.
 */
export interface AppManifestInterfaces {
    interfaces: AppManifestInterfaceEntry[];
}

export function readAppManifest(appManifestPath: string = APP_MANIFEST_PATH): any | undefined {
    let manifest: any;

    if (existsSync(appManifestPath)) {
        try {
            const file = readFileSync(appManifestPath, DEFAULT_BUFFER_ENCODING);
            manifest = JSON.parse(file);
            if (manifest instanceof Array) {
                // for backwards compatibility we use the first entry from the array
                manifest = manifest[0];
            }
        } catch (error) {
            console.error(`Unable to read App Manifest: '${error}'`);
            throw error;
        }
    } else {
        console.info('*** Info ***: No AppManifest found');
    }

    return manifest;
}

export async function createAppManifest(name: string, interfaces: AppManifestInterfaces) {
    const appManifest = { manifestVersion: 'v3', name: name, ...interfaces };
    outputFileSync(DEFAULT_APP_MANIFEST_PATH, JSON.stringify(appManifest, null, 4));
}
