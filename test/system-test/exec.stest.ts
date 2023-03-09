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
import YAML from 'yaml';

const VELOCITAS_PROCESS = join('..', '..', process.env['VELOCITAS_PROCESS'] ? process.env['VELOCITAS_PROCESS'] : 'velocitas');
const TEST_ROOT = cwd();
const VELOCITAS_HOME = `${homedir()}/.velocitas`;
function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
describe('CLI command', () => {
    describe('exec', () => {
        beforeEach(() => {
            process.chdir(`${TEST_ROOT}/testbench/test-exec`);
            copySync('./packages', `${VELOCITAS_HOME}/packages`);
            spawnSync(VELOCITAS_PROCESS, ['init']);
        });

        it('should be able to exec all exposed program specs of runtime-local', async () => {
            const packageOutput = spawnSync(VELOCITAS_PROCESS, ['package', 'devenv-runtime-local'], { encoding: 'utf-8' });
            const parsedPackageOutput = YAML.parse(packageOutput.stdout.toString());
            const runtimeLocalComponent = parsedPackageOutput['devenv-runtime-local'].components.find(
                (component: any) => component.id === 'runtime-local'
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
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'echo-env'], { encoding: 'utf-8' });

            expect(result.stdout).to.contain('VELOCITAS_WORKSPACE_DIR=');
            expect(result.stdout).to.contain('VELOCITAS_CACHE_DATA=');
            expect(result.stdout).to.contain('VELOCITAS_CACHE_DIR=');
        });

        it('should be able to run executables that are on the path', () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'executable-on-path'], { encoding: 'utf-8' });

            expect(result.stdout).to.be.equal('Hello World!\r\n');
        });

        it('should be able to let programs set cache values', () => {
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'set-cache'], { encoding: 'utf-8' });

            expect(result.error).to.be.undefined;
        });

        it('should be able to let programs get cache values', async () => {
            console.log('Setting Cache');
            const setCache = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'set-cache'], { encoding: 'utf-8' });
            console.log('Cache set');
            console.log('Waiting');
            await delay(5000);
            console.log('Getting Cache');
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'get-cache'], { encoding: 'utf-8' });
            console.log(result.stdout);
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
            const result = spawnSync(VELOCITAS_PROCESS, ['exec', 'test-component', 'tty'], { encoding: 'utf-8' });

            expect(result.error).to.be.undefined;
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
