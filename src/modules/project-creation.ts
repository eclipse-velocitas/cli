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

import axios, { AxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import decompress from 'decompress';
import { mkdtempSync } from 'fs';
import { copySync } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import Init from '../commands/init';
import Sync from '../commands/sync';
import { readAppManifest, writeAppManifest } from './app-manifest';
import { getPackageVersions, setApiToken, setProxy } from './package';
import { PackageConfig, ProjectConfig } from './project-config';
import { getLatestVersion } from './semver';

export async function createProject(appName: string, programmingLanguage: string) {
    const sdkDirectory = await downloadLatestSdk(programmingLanguage);
    composeProject(appName, sdkDirectory, programmingLanguage);

    await Init.run([]);
    await Sync.run([]);
}

async function downloadLatestSdk(programmingLanguage: string): Promise<string> {
    const requestHeaders: AxiosRequestHeaders = {
        accept: 'application/vnd.github+json',
    };
    setApiToken(requestHeaders);

    const requestConfig: AxiosRequestConfig = { headers: requestHeaders, responseType: 'arraybuffer', ...setProxy() };
    const res = await axios.get(`https://github.com/eclipse-velocitas/vehicle-app-python-sdk/archive/refs/tags/v0.8.0.zip`, requestConfig);

    if (res.status !== 200) {
        throw new Error(res.statusText);
    }

    const tmpDir = mkdtempSync(join(tmpdir(), 'sdk-'));
    console.log(`Tmpdir: ${tmpDir}`);

    await decompress(res.data, tmpDir, {
        strip: 1,
    }).catch((reason) => {
        console.error(reason);
    });

    return tmpDir;
}

async function composeProject(appName: string, sdkDirectory: string, programmingLanguage: string) {
    // TODO: prompt for example app to use
    const exampleName = 'seat-adjuster';
    copySync(join(sdkDirectory, 'examples', exampleName), './app');

    const appManifest = readAppManifest();
    appManifest.Name = appName;
    writeAppManifest(appManifest);

    // TODO: prompt for packages to add
    const packages = [
        'devenv-devcontainer-setup',
        'devenv-github-workflows',
        'devenv-github-templates',
        'devenv-runtime-local',
        'devenv-runtime-k3d',
    ];
    var projectConfig = new ProjectConfig();
    for (const packageName of packages) {
        const versions = await getPackageVersions(packageName);
        const latestVersion = getLatestVersion(versions.map((i) => i.name));

        const packageConfig = new PackageConfig();
        packageConfig.name = packageName;
        packageConfig.version = latestVersion;

        projectConfig.packages.push(packageConfig);
    }
    projectConfig.variables.set('language', programmingLanguage);
    projectConfig.variables.set('repoType', 'app');
    projectConfig.variables.set('appManifestPath', './app/AppManifest.json');
    projectConfig.variables.set('githubRepoId', '<myrepo>');
    projectConfig.write();

    // copy extra stuff, should be declared somewhere in SDK what to copy for a new app
    const files = ['.dapr', '.vscode', 'LICENSE'];
    for (const file of files) {
        copySync(join(sdkDirectory, file), join('.', file));
    }
}
