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
import { runtimeComponentManifestMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore } from '../../utils/mockfs';
// @ts-ignore: declaration file
import mockSpawn from 'mock-spawn';

describe('runtime', () => {
    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['runtime:list'])
        .it('lists available runtimes', (ctx) => {
            expect(ctx.stdout).to.contain('Available runtimes:');
            expect(ctx.stdout).to.contain(`* ${runtimeComponentManifestMock.components[0].alias}`);
        });
    test.do(() => {
        mockFolders(true, true);
        const attachedSpawn = mockSpawn();
        require('child_process').spawn = attachedSpawn;
        attachedSpawn.setDefault(attachedSpawn.simple(0 /* exit code */, 'Runtime Start Test - attached' /* stdout */));
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['runtime:start', 'local', '-v'])
        .it('simulates to start local runtime', (ctx) => {
            expect(ctx.stdout).to.contain(`Starting ${runtimeComponentManifestMock.components[0].programs[0].id}`);
            expect(ctx.stdout).to.contain(
                `Cannot start ${runtimeComponentManifestMock.components[0].programs[1].id} b/c ${runtimeComponentManifestMock.components[0].programs[0].id} is not yet ready!`
            );
            expect(ctx.stdout).to.contain(
                `Trying to match startup line: '${runtimeComponentManifestMock.components[0].start[0].startupLine}' vs 'Runtime Start Test - attached'`
            );
            expect(ctx.stdout).to.contain(
                `${runtimeComponentManifestMock.components[0].programs[0].id} Startup line found, process assumed to be running fine`
            );
            expect(ctx.stdout).to.contain(`${runtimeComponentManifestMock.components[0].programs[0].id} process exited with code 0`);
            expect(ctx.stdout).to.contain(`Dependent process ${runtimeComponentManifestMock.components[0].programs[0].id} reports 0`);
            expect(ctx.stdout).to.contain(`Starting ${runtimeComponentManifestMock.components[0].programs[1].id}`);
            expect(ctx.stdout).to.contain(`${runtimeComponentManifestMock.components[0].programs[1].id} process exited with code 0`);
        });

    test.do(() => {
        mockFolders(true, true);
        const detachedSpawn = mockSpawn();
        require('child_process').spawn = detachedSpawn;
        detachedSpawn.setDefault(detachedSpawn.simple(0 /* exit code */, 'Runtime Start Test - detached' /* stdout */));
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['runtime:start', 'local', '--detach', '-v'])
        .it('simulates to start local runtime in detached mode', (ctx) => {
            expect(ctx.stdout).to.contain(`Starting ${runtimeComponentManifestMock.components[0].programs[0].id}`);
            expect(ctx.stdout).to.contain(
                `Cannot start ${runtimeComponentManifestMock.components[0].programs[1].id} b/c ${runtimeComponentManifestMock.components[0].programs[0].id} is not yet ready!`
            );
            expect(ctx.stdout).to.contain(`${runtimeComponentManifestMock.components[0].programs[0].id} process exited with code 0`);
            expect(ctx.stdout).to.contain(`Dependent process ${runtimeComponentManifestMock.components[0].programs[0].id} reports 0`);
            expect(ctx.stdout).to.contain(`Starting ${runtimeComponentManifestMock.components[0].programs[1].id}`);
            expect(ctx.stdout).to.contain(`${runtimeComponentManifestMock.components[0].programs[1].id} process exited with code 0`);
        });

    test.do(() => {
        mockFolders(true, true);
        const failureSpawn = mockSpawn();
        require('child_process').spawn = failureSpawn;
        failureSpawn.setDefault(failureSpawn.simple(1 /* exit code */, 'Runtime Start Test - failure' /* stdout */));
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stderr()
        .command(['runtime:start', 'local', '-v'])
        .it('cannot start dependent service', (ctx) => {
            expect(ctx.stdout).to.contain(`Starting ${runtimeComponentManifestMock.components[0].programs[0].id}`);
            expect(ctx.stdout).to.contain(`${runtimeComponentManifestMock.components[0].programs[0].id} process exited with code 1`);
            expect(ctx.stderr).to.contain(
                `Cannot start ${runtimeComponentManifestMock.components[0].programs[1].id} b/c ${runtimeComponentManifestMock.components[0].programs[0].id} is not yet running!`
            );
        });

    test.do(() => {
        mockFolders(true, true);
        const stopSpawn = mockSpawn();
        require('child_process').spawn = stopSpawn;
        stopSpawn.setDefault(stopSpawn.simple(0 /* exit code */, 'Runtime Stop Test' /* stdout */));
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['runtime:stop', 'local'])
        .it('simulates to stop local runtime', (ctx) => {});
});
