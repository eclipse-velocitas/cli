// Copyright (c) 2022 Robert Bosch GmbH
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

import { Component, ComponentType, deserializeComponentJSON } from './component';
import { PackageConfig, userHomeDir } from './project-config';
import axios, { AxiosRequestHeaders } from 'axios';
import { existsSync, mkdirSync, readFileSync, rm } from 'node:fs';

import decompress from 'decompress';
import { join } from 'node:path';

export const DEFAULT_PACKAGE_FOLDER_PATH = `${userHomeDir}/.velocitas/packages`;
export const GITHUB_API_URL = 'https://api.github.com';
export const GITHUB_ORG_ENDPOINT = '/repos/eclipse-velocitas';

const PACKAGE_REPO = (packageName: string) => `${GITHUB_API_URL}${GITHUB_ORG_ENDPOINT}/${packageName}`;

export interface PackageManifest {
    components: Array<Component>;
}

export class VersionInfo {
    readonly name: string;
    readonly tarballUrl: string;

    constructor(name: string, tarballUrl: string) {
        this.name = name;
        this.tarballUrl = tarballUrl;
    }
}

export function readPackageManifest(packageConfig: PackageConfig): PackageManifest {
    try {
        const config: PackageManifest = deserializeComponentJSON(
            readFileSync(join(DEFAULT_PACKAGE_FOLDER_PATH, packageConfig.name, packageConfig.version, 'manifest.json'), 'utf-8')
        );
        return config;
    } catch (error) {
        console.log(`Cannot find component ${packageConfig.name}:${packageConfig.version}. Please update or init first!`);
        throw new Error(`Cannot find component ${packageConfig.name}:${packageConfig.version}`);
    }
}

export function getComponentByType(packageManifest: PackageManifest, type: ComponentType): Component {
    const component = packageManifest.components.find((component: Component) => component.type === type);
    if (component === undefined) {
        throw new TypeError(`No Subcomponent with type "${type}" found!`);
    }
    return component;
}

export function getPackageDirectory(packageName: string): string {
    return join(DEFAULT_PACKAGE_FOLDER_PATH, packageName);
}

export async function getPackageVersions(packageName: string): Promise<Array<VersionInfo>> {
    try {
        const requestHeaders: AxiosRequestHeaders = {
            accept: 'application/vnd.github+json',
        };

        if (process.env.GITHUB_API_TOKEN) {
            Object.assign(requestHeaders, {
                authorization: `Bearer ${process.env.GITHUB_API_TOKEN}`,
            });
        }

        const res = await axios.get(`${PACKAGE_REPO(packageName)}/tags`, {
            headers: requestHeaders,
        });

        if (res.status !== 200) {
            console.log(res.statusText);
            return new Array<VersionInfo>();
        }

        const availableVersions = new Array<VersionInfo>();
        for (const tagInfo of res.data) {
            availableVersions.push(new VersionInfo(tagInfo.name, tagInfo.tarball_url));
        }
        return availableVersions;
    } catch (error) {
        console.log(error);
    }

    return new Array<VersionInfo>();
}

export async function downloadPackageVersion(packageName: string, versionIdentifier: string): Promise<void> {
    try {
        const url = `${PACKAGE_REPO(packageName)}/zipball/refs/tags/${versionIdentifier}`;

        const res = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
        });

        if (res.status !== 200) {
            console.log(res.statusText);
            return;
        }
        const packageDir = join(getPackageDirectory(packageName), versionIdentifier);
        rm(packageDir, { recursive: true, force: true }, (_) => {});
        if (!existsSync(`${DEFAULT_PACKAGE_FOLDER_PATH}/${packageName}`)) {
            mkdirSync(`${DEFAULT_PACKAGE_FOLDER_PATH}/${packageName}`, { recursive: true });
        }
        await decompress(res.data, `${DEFAULT_PACKAGE_FOLDER_PATH}/${packageName}`, {
            map: (file) => {
                file.path = `${versionIdentifier}/${file.path}`;
                return file;
            },
            strip: 1,
        });
    } catch (error) {
        console.log(error);
    }
    return;
}

export function isPackageInstalled(packageName: string, versionIdentifier: string): boolean {
    const packageDir = `${DEFAULT_PACKAGE_FOLDER_PATH}/${packageName}/${versionIdentifier}`;
    if (!existsSync(packageDir)) {
        return false;
    }
    return true;
}
