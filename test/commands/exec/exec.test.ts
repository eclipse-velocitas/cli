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
import { existsSync } from 'fs';
import { ProjectCache } from '../../../src/modules/project-cache';
import { runtimeComponentManifestMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore } from '../../utils/mockfs';
// @ts-ignore: declaration file
import mockSpawn from 'mock-spawn';
import { getCacheData, writeCacheData } from '../../helpers/cache';

function echoProgram() {
    return function (this: any, cb: any) {
        this.stdout.write(`Echo program: ${this.args}\n`);
        return cb(0);
    };
}

function cacheProgram() {
    return function (this: any, cb: any) {
        this.stdout.write(`foo = bar >> VELOCITAS_CACHE\n`);
        this.stdout.write(`x=y >>  VELOCITAS_CACHE\n`);
        this.stdout.write(`0123='random' >> VELOCITAS_CACHE\n`);
        this.stdout.write(`var="asdc' >> VELOCITAS_CACHE\n`);
        return cb(0);
    };
}

describe('exec', () => {
    test.do(() => {
        mockFolders(true, true);
        const execSpawn = mockSpawn();
        require('child_process').spawn = execSpawn;
        execSpawn.setStrategy(echoProgram);
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
            expect(ctx.stdout.trim()).to.contain(`Echo program:`);
        });

    test.do(() => {
        mockFolders(true, true);
        const execSpawn = mockSpawn();
        require('child_process').spawn = execSpawn;
        execSpawn.setStrategy(echoProgram);
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
            expect(ctx.stdout.trim()).to.contain(`Echo program: additionalArgument`);
        });

    test.do(() => {
        mockFolders(true, true);
        const execSpawn = mockSpawn();
        require('child_process').spawnSync = execSpawn;
        execSpawn.setDefault(echoProgram);
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
        .command(['exec', `${runtimeComponentManifestMock.components[0].id}`, 'unknown-script'])
        .catch(
            `No program found for item 'unknown-script' referenced in program list of '${runtimeComponentManifestMock.components[0].id}'`
        )
        .it('throws error when program is not found in specified runtime component');

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['exec', `${runtimeComponentManifestMock.components[1].id}`, 'unknown-script'])
        .catch(
            `No program found for item 'unknown-script' referenced in program list of '${runtimeComponentManifestMock.components[1].id}'`
        )
        .it('throws error when program is not found in specified deployment component');

    test.do(() => {
        mockFolders(true, true);
        const execSpawn = mockSpawn();
        require('child_process').spawn = execSpawn;
        execSpawn.setStrategy(cacheProgram);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['exec', runtimeComponentManifestMock.components[0].id, runtimeComponentManifestMock.components[0].programs[0].id])
        .it('captures variables output to VELOCITAS_CACHE', (ctx) => {
            expect(ctx.stdout.trim()).to.contain('foo = bar >> VELOCITAS_CACHE');
            expect(ctx.stdout.trim()).to.contain('x=y >>  VELOCITAS_CACHE');
            expect(ctx.stdout.trim()).to.contain("0123='random' >> VELOCITAS_CACHE");
            expect(ctx.stdout.trim()).to.contain(`var="asdc' >> VELOCITAS_CACHE`);
            expect(existsSync(ProjectCache.getCacheDir())).to.be.true;

            const cacheData = getCacheData();
            expect(cacheData).to.include.keys('foo');
            expect(cacheData).to.include.keys('x');
            expect(cacheData).to.include.keys('0123');
            expect(cacheData).to.not.include.keys('var');

            expect(cacheData.foo).to.be.equal('bar');
            expect(cacheData.x).to.be.equal('y');
            expect(cacheData['0123']).to.be.equal('random');
        });

    test.do(() => {
        mockFolders(true, true);
        const execSpawn = mockSpawn();
        require('child_process').spawn = execSpawn;
        execSpawn.setStrategy(
            () =>
                function (this: any, cb: any) {
                    this.stdout.write(this.opts.env['VELOCITAS_PROJECT_CACHE_DATA'] + '\n');
                    this.stdout.write(this.opts.env['VELOCITAS_PROJECT_CACHE_DIR'] + '\n');
                    return cb(0);
                }
        );

        writeCacheData({ foo: 'bar' });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['exec', runtimeComponentManifestMock.components[0].id, runtimeComponentManifestMock.components[0].programs[0].id])
        .it('should make cache available as env vars', (ctx) => {
            const lines = ctx.stdout.trim().split('\n');
            expect(lines[0]).to.equal('{"foo":"bar"}');
            expect(lines[1]).to.contain('.velocitas/projects/');
        });
});
