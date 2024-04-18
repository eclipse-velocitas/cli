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
import { copySync, removeSync } from 'fs-extra';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { DEFAULT_BUFFER_ENCODING } from '../../src/modules/constants';
import { TEST_ROOT, VELOCITAS_HOME, VELOCITAS_PROCESS } from '../utils/systemTestConfig';

const packageManifestOne = JSON.parse(
    readFileSync('./testbench/test-sync/packages/test-packageOne/test-version/manifest.json', DEFAULT_BUFFER_ENCODING),
);
const packageManifestTwo = JSON.parse(
    readFileSync('./testbench/test-sync/packages/test-packageTwo/test-version/manifest.json', DEFAULT_BUFFER_ENCODING),
);

const fileOneDestination = packageManifestOne.components[0].files[0].dst;
const fileTwoDestination = packageManifestTwo.components[0].files[0].dst;

describe('CLI command', () => {
    describe('sync', () => {
        beforeEach(() => {
            process.chdir(`${TEST_ROOT}/testbench/test-sync`);
            copySync('./packages', `${VELOCITAS_HOME}/packages`);
        });
        afterEach(() => {
            removeSync(`./${fileOneDestination}`);
            removeSync(`./${fileTwoDestination}`);
        });
        it('should sync configured setup components and replace variables accordingly', async () => {
            const syncOutput = spawnSync(VELOCITAS_PROCESS, ['sync'], { encoding: DEFAULT_BUFFER_ENCODING });
            expect(syncOutput.status).to.equal(0);

            const resultOne = spawnSync(`./${fileOneDestination}`, {
                encoding: DEFAULT_BUFFER_ENCODING,
            });
            expect(resultOne.stdout).to.contain('projectTest');
            expect(resultOne.stdout).to.contain('packageTestOne');
            expect(resultOne.stdout).to.contain(1);

            const resultTwo = spawnSync(`./${fileTwoDestination}`, {
                encoding: DEFAULT_BUFFER_ENCODING,
            });
            expect(resultTwo.stdout).to.contain('projectTest');
            expect(resultTwo.stdout).to.contain('packageTestTwo');
            expect(resultTwo.stdout).to.contain(2);
        });
    });
});
