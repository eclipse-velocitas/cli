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
import { spawn, spawnSync } from 'child_process';
import { copySync } from 'fs-extra';
import { homedir } from 'node:os';
import { join } from 'path';
import { cwd } from 'process';
// eslint-disable-next-line @typescript-eslint/naming-convention
import YAML from 'yaml';
import { DEFAULT_BUFFER_ENCODING } from '../../src/modules/constants';
import { readFileSync } from 'fs';

const VELOCITAS_PROCESS = join('..', '..', process.env['VELOCITAS_PROCESS'] ? process.env['VELOCITAS_PROCESS'] : 'velocitas');
const TEST_ROOT = cwd();
const VELOCITAS_HOME = `${homedir()}/.velocitas`;

describe('CLI command', () => {
    describe('exec', () => {
        beforeEach(() => {
            process.chdir(`${TEST_ROOT}/testbench/test-exec`);
            copySync('./packages', `${VELOCITAS_HOME}/packages`);
            spawnSync(VELOCITAS_PROCESS, ['init']);
        });

        it('should be able to exec all exposed program specs of runtime-local', async () => {
            const packageOutput = spawnSync(VELOCITAS_PROCESS, ['package', 'devenv-runtime-local'], { encoding: DEFAULT_BUFFER_ENCODING });
            const parsedPackageOutput = YAML.parse(packageOutput.stdout.toString());
            const runtimeLocalComponent = parsedPackageOutput['devenv-runtime-local'].components.find(
                (component: any) => component.id === 'runtime-local',
            );
            let spawnSuccesful = false;
            for (const exposedProgramSpec of runtimeLocalComponent.programs) {
                console.log(`Try to spawn exposed program of 'runtime-local': ${exposedProgramSpec.id}`);
                spawnSuccesful = await checkSpawn(exposedProgramSpec.id);
                continue;
            }
            expect(spawnSuccesful).to.be.true;
        });

        it('should pass environment variables to the spawned process', async () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'echo-env'], { encoding: DEFAULT_BUFFER_ENCODING });

            const expectedString = JSON.stringify(JSON.parse(readFileSync('./app/AppManifest.json', 'utf-8')));
            expect(result.stdout).to.contain('VELOCITAS_WORKSPACE_DIR=');
            expect(result.stdout).to.contain('VELOCITAS_CACHE_DATA=');
            expect(result.stdout).to.contain('VELOCITAS_CACHE_DIR=');
            expect(result.stdout).to.contain(`VELOCITAS_APP_MANIFEST=${expectedString}`);
            expect(result.stdout).to.contain(`VELOCITAS_PACKAGE_DIR=${VELOCITAS_HOME}/packages/test-package/test-version`);
        });

        it('should be able to run executables that are on the path', () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'executable-on-path'], {
                encoding: DEFAULT_BUFFER_ENCODING,
            });

            expect(result.stdout).to.be.equal('Hello World!\r\n');
        });

        it('should be able to let programs set cache values', () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'set-cache'], { encoding: DEFAULT_BUFFER_ENCODING });

            expect(result.error).to.be.undefined;
        });

        it('should be able to let programs get cache values', () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'get-cache'], { encoding: DEFAULT_BUFFER_ENCODING });

            expect(result.stdout).to.contain('my_cache_key');
            expect(result.stdout).to.contain('my_cache_value');
            expect(result.stdout).to.contain('foo');
            expect(result.stdout).to.contain('bar');
            expect(result.stdout).to.contain('x');
            expect(result.stdout).to.contain('y');
            expect(result.stdout).to.contain('0123');
            expect(result.stdout).to.contain('random');
            expect(result.stdout).to.not.contain('var');
            expect(result.stdout).to.not.contain('asdc');
        });

        it('should be able to run programs which read from stdin', () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'tty'], { encoding: DEFAULT_BUFFER_ENCODING });

            expect(result.error).to.be.undefined;
        });

        it('should append user-provided args to the default args', () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'print-args', 'hello', 'world'], {
                encoding: DEFAULT_BUFFER_ENCODING,
            });

            const lines = result.stdout.split('\n').map((line) => line.trim());
            expect(lines.length).to.be.equal(6);
            expect(lines[0]).to.be.equal('./print-args.py');
            expect(lines[1]).to.be.equal('default');
            expect(lines[2]).to.be.equal('foo');
            expect(lines[3]).to.be.equal('hello');
            expect(lines[4]).to.be.equal('world');
            expect(lines[5]).to.be.equal('');
        });

        it('should pass no additional args if none are given', async () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'print-args-no-default'], {
                encoding: DEFAULT_BUFFER_ENCODING,
            });

            const lines = result.stdout.split('\n').map((line) => line.trim());
            expect(lines.length).to.be.equal(2);
            expect(lines[0]).to.be.equal('./print-args.py');
            expect(lines[1]).to.be.equal('');
        });

        it('should pass flags after the program-ref to the executed program', async () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'print-args-no-default', '--flag', 'myValue'], {
                encoding: DEFAULT_BUFFER_ENCODING,
            });

            const lines = result.stdout.split('\n').map((line) => line.trim());
            expect(lines.length).to.be.equal(4);
            expect(lines[0]).to.be.equal('./print-args.py');
            expect(lines[1]).to.be.equal('--flag');
            expect(lines[2]).to.be.equal('myValue');
            expect(lines[3]).to.be.equal('');
        });

        it('should not pass the verbose flag in 2nd position to the executed program', async () => {
            const result = spawnSync(
                VELOCITAS_PROCESS,
                ['exec', 'test-component', '-v', 'print-args-no-default', '-random', 'flag', 'regular=flag2'],
                {
                    encoding: DEFAULT_BUFFER_ENCODING,
                },
            );

            const lines = result.stdout.split('\n').map((line) => line.trim());
            expect(lines.length).to.be.equal(6);
            expect(lines[0]).to.be.equal('Starting test-component/print-args-no-default');
            expect(lines[1]).to.be.equal('./print-args.py');
            expect(lines[2]).to.be.equal('-random');
            expect(lines[3]).to.be.equal('flag');
            expect(lines[4]).to.be.equal('regular=flag2');
            expect(lines[5]).to.be.equal('');
        });

        it('should not pass the verbose flag in 1st position to the executed program', async () => {
            const result = spawnSync(
                VELOCITAS_PROCESS,
                ['exec', '-v', 'test-component', 'print-args-no-default', '-other', 'thing', 'regular=flag2'],
                {
                    encoding: DEFAULT_BUFFER_ENCODING,
                },
            );

            const lines = result.stdout.split('\n').map((line) => line.trim());
            expect(lines.length).to.be.equal(6);
            expect(lines[0]).to.be.equal('Starting test-component/print-args-no-default');
            expect(lines[1]).to.be.equal('./print-args.py');
            expect(lines[2]).to.be.equal('-other');
            expect(lines[3]).to.be.equal('thing');
            expect(lines[4]).to.be.equal('regular=flag2');
            expect(lines[5]).to.be.equal('');
        });

        it('should return the error code of the first executed program which returns an error', async () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'exit'], {
                encoding: DEFAULT_BUFFER_ENCODING,
            });
            expect(result.status).to.be.equal(1);
        });
    });
});

const checkSpawn = async (exposedProgramSpecId: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        try {
            const processSpawn = spawn(VELOCITAS_PROCESS, ['exec', 'runtime-local', exposedProgramSpecId], {
                stdio: 'inherit',
            });
            processSpawn.on('spawn', () => {
                console.log(`Spawned ${exposedProgramSpecId} succesfully - killing process`);
                processSpawn.kill();
                resolve(true);
            });
            processSpawn.on('error', () => {
                console.log(`Spawning ${exposedProgramSpecId} resulted in an error`);
                resolve(false);
            });
        } catch (e) {
            reject(e);
        }
    });
};
