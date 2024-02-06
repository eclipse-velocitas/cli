// Copyright (c) 2022-2024 Contributors to the Eclipse Foundation
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

import mockfs from 'mock-fs';
import * as os from 'os';
import * as path from 'path';
import { ProjectCache } from '../../src/modules/project-cache';
import {
    appManifestMock,
    corePackageManifestMock,
    mockCacheContent,
    packageIndexMock,
    runtimePackageManifestMock,
    setupPackageManifestMock,
    velocitasConfigMock,
} from './mockConfig';

export const userHomeDir = os.homedir();
const runtimePackagePath = `${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].repo}/${velocitasConfigMock.packages[0].version}`;
const setupPackagePath = `${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].repo}/${velocitasConfigMock.packages[1].version}`;
const corePackagePath = `${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[2].repo}/${velocitasConfigMock.packages[2].version}`;

type MockConfig = {
    velocitasConfig?: boolean;
    installedComponents?: boolean;
    appManifest?: boolean;
    mockCache?: boolean;
    packageIndex?: boolean;
};

export const mockFolders = (mockConfig?: MockConfig) => {
    const mockfsConf: any = {
        'package.json': mockfs.load(path.resolve(__dirname, '../../package.json')),
        'tsconfig.json': mockfs.load(path.resolve(__dirname, '../../tsconfig.json')),
        src: mockfs.load(path.resolve(__dirname, '../../src')),
        test: mockfs.load(path.resolve(__dirname, '../../test')),
        node_modules: mockfs.load(path.resolve(__dirname, '../../node_modules')),
        app: {
            'AppManifest.json': JSON.stringify(appManifestMock),
        },
    };
    if (mockConfig && mockConfig.appManifest === false) {
        delete mockfsConf.app;
    }
    if (mockConfig && mockConfig.velocitasConfig) {
        mockfsConf['.velocitas.json'] = JSON.stringify(velocitasConfigMock);
    }
    if (mockConfig && mockConfig.installedComponents) {
        mockfsConf[runtimePackagePath] = {
            'manifest.json': JSON.stringify(runtimePackageManifestMock),
            src: {},
        };
        mockfsConf[setupPackagePath] = {
            'manifest.json': JSON.stringify(setupPackageManifestMock),
        };
        mockfsConf[corePackagePath] = {
            'manifest.json': JSON.stringify(corePackageManifestMock),
        };
    }
    if (mockConfig && mockConfig.mockCache) {
        mockfsConf[ProjectCache.getCacheDir()] = {
            'cache.json': JSON.stringify(mockCacheContent),
        };
    }
    if (mockConfig && mockConfig.packageIndex) {
        mockfsConf['package-index.json'] = JSON.stringify(packageIndexMock);
    }
    mockfs(mockfsConf, { createCwd: false });
};

export const mockRestore = () => mockfs.restore();
