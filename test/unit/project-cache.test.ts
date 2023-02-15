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

import { expect } from 'chai';
import 'mocha';
import { ProjectCache } from '../../src/modules/project-cache';

describe('project-cache - module', () => {
    it('should get a project specific cache hash', async () => {
        const exampleProjectPathOne = '/this/is/path/one/project-1';
        const exampleProjectPathTwo = '/this/is/path/two/project-1';
        const cacheDirOne = ProjectCache.getCacheDir(exampleProjectPathOne);
        const cacheDirTwo = ProjectCache.getCacheDir(exampleProjectPathTwo);
        expect(cacheDirOne).to.not.be.equal(cacheDirTwo);
    });
});
