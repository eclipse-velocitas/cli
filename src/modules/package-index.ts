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

export function getPackageIndex(packageIndexPath: string = './package-index.json') {
    try {
        const packageIndexFile = readFileSync(packageIndexPath, DEFAULT_BUFFER_ENCODING);
        const packageIndex = JSON.parse(packageIndexFile);
        return packageIndex;
    } catch (error) {
        throw new Error('No package-index.json found.');
    }
}

export function setLanguages(packageIndex: any): any[] {
    const AVAILABLE_LANGUAGES: any[] = [];
    packageIndex = packageIndex.filter((packageEle: any) => packageEle.type === 'core');
    packageIndex.forEach((packageEntry: any) => {
        const match = packageEntry.package.match(sdkPattern);
        if (match) {
            const language = match[1];
            AVAILABLE_LANGUAGES.push({ name: language });
        }
    });
    return AVAILABLE_LANGUAGES;
}

export function setExamples(packageIndex: any): any[] {
    const AVAILABLE_EXAMPLES: any[] = [];
    packageIndex = packageIndex.filter((packageEle: any) => packageEle.type === 'core');
    packageIndex.forEach((packageEntry: any) => {
        const match = packageEntry.package.match(sdkPattern);
        if (match) {
            const examples = packageEntry.exposedInterfaces.filter((exposed: any) => exposed.type === 'examples');
            for (const example in examples[0].args) {
                const language = match[1];
                AVAILABLE_EXAMPLES.push({
                    name: examples[0].args[example].description,
                    value: examples[0].args[example].name,
                    language: language,
                });
            }
        }
    });
    return AVAILABLE_EXAMPLES;
}

export function setPackages(packageIndex: any): any[] {
    const AVAILABLE_PACKAGES: any[] = [];
    packageIndex = packageIndex.filter((packageEle: any) => packageEle.type === 'extension');
    packageIndex.forEach((packageEntry: any) => {
        const match = packageEntry.package.match(packagesPattern);
        const packageName = match ? match[1] : null;
        if (packageName) {
            AVAILABLE_PACKAGES.push({ name: packageName, checked: true });
        }
    });
    return AVAILABLE_PACKAGES;
}

export function setInterfaces(packageIndex: any): any[] {
    const AVAILABLE_INTERFACES: any[] = [];
    packageIndex = packageIndex.filter((packageEle: any) => packageEle.type === 'extension');
    packageIndex.forEach((packageEntry: any) => {
        const match = packageEntry.package.match(packagesPattern);
        if (match) {
            if (packageEntry.exposedInterfaces && Array.isArray(packageEntry.exposedInterfaces)) {
                packageEntry.exposedInterfaces.forEach((exposedInterface: any) => {
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
