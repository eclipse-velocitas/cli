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

import { corePackageManifestMock, runtimePackageManifestMock } from '../utils/mockConfig';
import { CliFileSystem } from '../../src/utils/fs-bridge';

export const simpleGitInstanceMock = (mockedNewVersionTag?: string) => {
    return {
        clone: async (repoPath: string, localPath: string, options?: any) => {
            await CliFileSystem.promisesMkdir(localPath);
            await CliFileSystem.promisesWriteFile(`${localPath}/.git`, 'This is a git repo');

            if (repoPath.indexOf('package-main') !== -1) {
                await CliFileSystem.promisesWriteFile(`${localPath}/manifest.json`, JSON.stringify(corePackageManifestMock));
            } else {
                await CliFileSystem.promisesWriteFile(`${localPath}/manifest.json`, JSON.stringify(runtimePackageManifestMock));
            }
        },
        checkIsRepo: () => {
            return true;
        },
        fetch: () => {},
        checkout: () => {
            // Function implementation
        },
        tags: () => {
            if (mockedNewVersionTag) {
                return { all: [mockedNewVersionTag] };
            }
            return { all: ['v1.1.1'] };
        },
    };
};
