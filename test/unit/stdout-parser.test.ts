// Copyright (c) 2024 Contributors to the Eclipse Foundation
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

import { expect } from 'chai';
import { ProjectCache } from '../../src/modules/project-cache';
import { stdOutParser } from '../../src/modules/stdout-parser';
import { CliFileSystem, MockFileSystem, MockFileSystemObj } from '../../src/utils/fs-bridge';
import { getCacheData } from '../helpers/cache';

describe('stdOutParser - module', () => {
    var matches = new Map<string, any>([
        ['test_1 = "/this/is/path/one" >> VELOCITAS_CACHE', '/this/is/path/one'],
        ["test_2 = '/this/is/path/one' >> VELOCITAS_CACHE", '/this/is/path/one'],
        ['test_3 = test3 >> VELOCITAS_CACHE', 'test3'],
        ['test_4 = ["/this/is/path/one", "/this/is/path/two"] >> VELOCITAS_CACHE', ['/this/is/path/one', '/this/is/path/two']],
        ['test_5 = ["/this/is/path/one","/this/is/path/two"]  >> VELOCITAS_CACHE', ['/this/is/path/one', '/this/is/path/two']],
        ['test_6 = ["/this/is/path/one",    "/this/is/path/two"]  >> VELOCITAS_CACHE', ['/this/is/path/one', '/this/is/path/two']],
        ['test_7 =["/this/is/path/one", "/this/is/path/two"]  >> VELOCITAS_CACHE', ['/this/is/path/one', '/this/is/path/two']],
        ['test_8=["/this/is/path/one", "/this/is/path/two"]  >> VELOCITAS_CACHE', ['/this/is/path/one', '/this/is/path/two']],
        ["test_9 = ['/this/is/path/one', /this/is/path/two]  >> VELOCITAS_CACHE", ['/this/is/path/one', '/this/is/path/two']],
        ['test_10 = [/this/is/path/one, "/this/is/path/two"]  >> VELOCITAS_CACHE', ['/this/is/path/one', '/this/is/path/two']],
        ['test_11 = [/this/is/path/one, /this/is/path/two]  >> VELOCITAS_CACHE', ['/this/is/path/one', '/this/is/path/two']],
    ]);

    before(() => {
        const projectCacheDir = ProjectCache.getCacheDir();
        const mockFilesystem: MockFileSystemObj = {
            [`${projectCacheDir}/cache.json`]: '{}',
        };
        CliFileSystem.setImpl(new MockFileSystem(mockFilesystem));
    });
    for (let [element, result] of matches) {
        it('should match and set project cache correct', () => {
            let id = element.split('=')[0].trim();
            const projectCache = ProjectCache.read();
            stdOutParser(projectCache, element);
            expect(JSON.stringify(projectCache.get(id))).to.equal(JSON.stringify(result));
        });
    }

    var noMatches = new Map<string, any>([
        ['test_1 = "/this/is/path/one >> VELOCITAS_CACHE', {}],
        ["test_2 = '/this/is/path/one >> VELOCITAS_CACHE", {}],
        ['test_3 = /this/is/path/one"this/test >> VELOCITAS_CACHE', {}],
        ['test_4 = ["/this/is/path/one", /this/is/path/two"]', {}],
        ['test_5 = ["/this/is/path/one""/this/is/path/two"]  >> VELOCITAS_CACHE', {}],
        ['"test_6" = ["/this/is/path/one", "/this/is/path/two"]  >> VELOCITAS_CACHE', {}],
        ['test_7 = [/this/is/path/one""/this/is/path/two"]  >> VELOCITAS_CACHE', {}],
        ["test_8 = ['/this/is/path/one''/this/is/path/two']  >> VELOCITAS_CACHE", {}],
    ]);
    noMatches.forEach((result, element) => {
        it('should not match for wrong inputs', async () => {
            const projectCache = ProjectCache.read();
            stdOutParser(projectCache, element);
            expect(JSON.stringify(getCacheData())).to.equal(JSON.stringify(result));
        });
    });
});
