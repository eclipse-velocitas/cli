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

import * as fs from 'fs';
import { runtimeComponentManifestMock } from '../utils/mockConfig';

export const simpleGitInstanceMock = (mockedNewVersionTag?: string) => {
    return {
        clone: async (repoPath: string, localPath: string, options?: any) => {
            await fs.promises.mkdir(localPath, { recursive: true });
            await fs.promises.writeFile(`${localPath}/.git`, 'This is a git repo');
            await fs.promises.writeFile(`${localPath}/manifest.json`, JSON.stringify(runtimeComponentManifestMock));
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
