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
import { runtimeComponentManifestMock, setupComponentManifestMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore } from '../../utils/mockfs';
// @ts-ignore: declaration file
import mockSpawn from 'mock-spawn';

describe('exec', () => {
    test.do(() => {
        mockFolders(true, true);
        const execSpawn = mockSpawn();
        require('child_process').spawn = execSpawn;
        execSpawn.setDefault(execSpawn.simple(0 /* exit code */, 'Execute Script Test' /* stdout */));
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command([
            'exec',
            `${runtimeComponentManifestMock.components[0].id}`,
            `${runtimeComponentManifestMock.components[0].programs[0].id}`,
        ])
        .it('executes a runtime script', (ctx) => {
            // placeholder
        });

    test.do(() => {
        mockFolders(true, true);
        const execSpawn = mockSpawn();
        require('child_process').spawn = execSpawn;
        execSpawn.setDefault(execSpawn.simple(0 /* exit code */, 'Execute Script Test' /* stdout */));
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command([
            'exec',
            `${runtimeComponentManifestMock.components[0].id}`,
            `${runtimeComponentManifestMock.components[0].programs[0].id}`,
            `--args`,
            `additionalArgument`,
        ])
        .it('executes a runtime script with additional arguments', (ctx) => {
            expect(ctx.stdout).to.contain(`additionalArgument`);
        });

    test.do(() => {
        mockFolders(true, true);
        const execSpawn = mockSpawn();
        require('child_process').spawn = execSpawn;
        execSpawn.setDefault(execSpawn.simple(0 /* exit code */, 'Execute Script Test' /* stdout */));
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command([
            'exec',
            `${runtimeComponentManifestMock.components[1].id}`,
            `${runtimeComponentManifestMock.components[1].programs[0].id}`,
        ])
        .it('executes a deployment script', (ctx) => {
            // placeholder
        });

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['exec', `${setupComponentManifestMock.components[0].id}`, `${setupComponentManifestMock.components[0].id}`])
        .catch(`${setupComponentManifestMock.components[0].id} is not a runtime or deployment component!`)
        .it('throws error when component is not of type runtime or deployment');

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['exec', `${runtimeComponentManifestMock.components[0].id}`, 'unknown-script'])
        .catch(`Program with ID 'unknown-script' not found in '${runtimeComponentManifestMock.components[0].id}'`)
        .it('throws error when program is not found in specified runtime component');

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['exec', `${runtimeComponentManifestMock.components[1].id}`, 'unknown-script'])
        .catch(`Program with ID 'unknown-script' not found in '${runtimeComponentManifestMock.components[1].id}'`)
        .it('throws error when program is not found in specified deployment component');
});
