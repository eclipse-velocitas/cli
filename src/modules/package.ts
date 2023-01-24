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

import axios, { AxiosProxyConfig, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import decompress from 'decompress';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { existsSync, mkdirSync, readFileSync, rm } from 'node:fs';
import { join } from 'node:path';
import { Component, ComponentType, deserializeComponentJSON } from './component';
import { PackageConfig, userHomeDir } from './project-config';

export const DEFAULT_PACKAGE_FOLDER_PATH = `${userHomeDir}/.velocitas/packages`;
export const GITHUB_API_URL = 'https://api.github.com';
export const GITHUB_ORG_ENDPOINT = '/repos/eclipse-velocitas';

const PACKAGE_REPO = (packageName: string) => `${GITHUB_API_URL}${GITHUB_ORG_ENDPOINT}/${packageName}`;

function setProxy() {
    let proxyConfig: { proxy?: AxiosProxyConfig | false; httpsAgent?: any } = { proxy: false };
    if (process.env.HTTPS_PROXY || process.env.https_proxy) {
        const proxyString = process.env.HTTPS_PROXY || process.env.https_proxy;
        proxyConfig.httpsAgent = new HttpsProxyAgent(proxyString!);
    }

    return proxyConfig;
}

function setApiToken(requestHeaders: AxiosRequestHeaders): void {
    if (process.env.GITHUB_API_TOKEN) {
        Object.assign(requestHeaders, {
            authorization: `Bearer ${process.env.GITHUB_API_TOKEN}`,
        });
    }
}

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
        console.log(`Cannot find component ${packageConfig.name}:${packageConfig.version}. Please upgrade or init first!`);
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
        setApiToken(requestHeaders);

        const requestConfig: AxiosRequestConfig = { headers: requestHeaders, ...setProxy() };
        const res = await axios.get(`${PACKAGE_REPO(packageName)}/tags`, requestConfig);

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

export async function downloadPackageVersion(packageName: string, versionIdentifier: string, verbose?: boolean): Promise<void> {
    try {
        const res = await downloadPackageRequest(packageName, versionIdentifier, verbose);

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

async function downloadPackageRequest(packageName: string, versionIdentifier: string, verbose?: boolean): Promise<AxiosResponse<any, any>> {
    const defaultUrl = `${PACKAGE_REPO(packageName)}/zipball/refs/tags/${versionIdentifier}`;
    const fallbackUrl = `${PACKAGE_REPO(packageName)}/zipball/${versionIdentifier}`;
    const requestHeaders: AxiosRequestHeaders = {
        accept: 'application/vnd.github+json',
    };
    setApiToken(requestHeaders);

    axiosRetry(axios, {
        retries: 1,
        retryCondition: (error) => {
            if (error.response?.status === 404) {
                if (verbose) {
                    console.log(`Did not find tag '${versionIdentifier}' in '${packageName}' - looking for branch ...`);
                }
                return true;
            }
            return false;
        },
        onRetry: (_retryCount, _error, requestConfig) => {
            if (verbose) {
                console.log(`Try using fallback URL '${fallbackUrl}' to download package ...`);
            }
            requestConfig.url = fallbackUrl;
            return requestConfig;
        },
    });

    const requestConfig: AxiosRequestConfig = { headers: requestHeaders, responseType: 'arraybuffer', ...setProxy() };
    const res = await axios.get(defaultUrl, requestConfig);

    if (verbose) {
        console.log(`Succesfully downloaded package: '${packageName}:${versionIdentifier}'`);
    }

    return res;
}
