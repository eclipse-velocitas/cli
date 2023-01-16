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

import mockfs from 'mock-fs';
import * as os from 'os';
import * as path from 'path';
import { appManifestMock, runtimeComponentManifestMock, setupComponentManifestMock, velocitasConfigMock } from './mockConfig';

export const userHomeDir = os.homedir();
const runtimeComponent = `${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}/${velocitasConfigMock.packages[0].version}`;
const setupComponent = `${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].name}/${velocitasConfigMock.packages[1].version}`;

export const mockFolders = (withVelocitasConfig: boolean = false, withInstalledComponents: boolean = false) => {
    const mockfsConf: any = {
        'package.json': mockfs.load(path.resolve(__dirname, '../../package.json')),
        'tsconfig.json': mockfs.load(path.resolve(__dirname, '../../tsconfig.json')),
        src: mockfs.load(path.resolve(__dirname, '../../src')),
        test: mockfs.load(path.resolve(__dirname, '../../test')),
        node_modules: mockfs.load(path.resolve(__dirname, '../../node_modules')),
        app: {
            'AppManifest.json': mockfs.file({
                content: `${JSON.stringify(appManifestMock)}`,
            }),
        },
    };
    if (withVelocitasConfig) {
        mockfsConf['.velocitas.json'] = `${JSON.stringify(velocitasConfigMock)}`;
    }
    if (withInstalledComponents) {
        mockfsConf[runtimeComponent] = {
            'manifest.json': mockfs.file({
                content: `${JSON.stringify(runtimeComponentManifestMock)}`,
            }),
        };
        mockfsConf[setupComponent] = {
            'manifest.json': mockfs.file({
                content: `${JSON.stringify(setupComponentManifestMock)}`,
            }),
        };
    }
    mockfs(mockfsConf, { createCwd: false });
};

export const mockRestore = () => mockfs.restore();
