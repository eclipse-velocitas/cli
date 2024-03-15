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

import { createHash } from 'node:crypto';
import { mkdirSync, PathLike, readFileSync, writeFileSync } from 'node:fs';
import fse from 'fs-extra/esm';
import { join, parse } from 'node:path';
import { DEFAULT_BUFFER_ENCODING } from './constants.js';
import { mapReplacer } from './helpers.js';
import { getVelocitasRoot } from './package.js';

const FILE_NAME = 'cache.json';

export class ProjectCache {
    private _data: Map<string, any>;

    private constructor() {
        this._data = new Map<string, any>();
    }

    public get(key: string): any {
        return this._data.get(key);
    }

    public set(key: string, value: any) {
        this._data.set(key, value);
    }

    public raw(): Map<string, any> {
        return this._data;
    }

    public clear() {
        this._data.clear();
    }

    static read(path: string = join(ProjectCache.getCacheDir(), FILE_NAME)): ProjectCache {
        const cache = new ProjectCache();
        try {
            const data: any = JSON.parse(readFileSync(path, DEFAULT_BUFFER_ENCODING));
            cache._data = new Map(Object.entries(data));
        } catch (e: any) {
            if (e.code !== 'ENOENT') {
                throw e;
            }
        }
        return cache;
    }

    static getCacheDir(projectPath: PathLike = process.cwd()): string {
        const projectPathHash = createHash('md5').update(projectPath.toString()).digest('hex');
        return join(getVelocitasRoot(), 'projects', projectPathHash);
    }

    write(path: string = join(ProjectCache.getCacheDir(), FILE_NAME)) {
        const parsedPath = parse(path);
        if (!fse.pathExistsSync(parsedPath.base)) {
            mkdirSync(parsedPath.dir, { recursive: true });
        }
        writeFileSync(path, JSON.stringify(this._data, mapReplacer));
    }
}
