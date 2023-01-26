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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'node:path';
import { ProjectCache } from '../../src/modules/project-cache';

export const getCacheData = () => {
    return JSON.parse(readFileSync(`${ProjectCache.getCacheDir()}/cache.json`, 'utf-8'));
};

export function writeCacheData(cacheData: any) {
    if (!existsSync(ProjectCache.getCacheDir())) {
        mkdirSync(ProjectCache.getCacheDir(), { recursive: true });
    }
    return writeFileSync(join(ProjectCache.getCacheDir(), 'cache.json'), JSON.stringify(cacheData), { encoding: 'utf-8' });
}
