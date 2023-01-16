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

import { expect, test } from '@oclif/test';
import { mockFolders, mockRestore } from '../../utils/mockfs';
// @ts-ignore: declaration file
import mockSpawn from 'mock-spawn';

describe('deploy', () => {
    test.do(() => {
        mockFolders(true, true);
        const deploySpawn = mockSpawn();
        require('child_process').spawn = deploySpawn;
        deploySpawn.setDefault(deploySpawn.simple(0 /* exit code */, 'Deploy Test' /* stdout */));
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['deploy', 'local'])
        .it('deploys Vehicle App to a runtime', (ctx) => {
            expect(ctx.stdout).to.contain('Deploy Test');
        });

    test.do(() => {
        mockFolders(true, true);
        const deploySpawn = mockSpawn();
        require('child_process').spawn = deploySpawn;
        deploySpawn.setDefault(deploySpawn.simple(0 /* exit code */, '' /* stdout */, 'Deploy Test Error' /* stderr */));
    })
        .finally(() => {
            mockRestore();
        })
        .stderr()
        .command(['deploy', 'local'])
        .it('deploys Vehicle App to a runtime with an error', (ctx) => {
            expect(ctx.stderr).to.contain('Deploy Test Error');
        });
});
