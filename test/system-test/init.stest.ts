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
import { spawnSync } from 'child_process';
import { copySync, removeSync, existsSync, readFileSync, readdirSync } from 'fs-extra';
// eslint-disable-next-line @typescript-eslint/naming-convention
import { DEFAULT_BUFFER_ENCODING } from '../../src/modules/constants';
import { TEST_ROOT, VELOCITAS_HOME, VELOCITAS_PROCESS } from '../utils/systemTestConfig';
import { ProjectConfig } from '../../src/modules/project-config';
import { ProjectCache } from '../../src/modules/project-cache';
import { join } from 'path';

const isDirectoryEmpty = (directoryPath: string): boolean => {
    const files = readdirSync(directoryPath);
    return files.length === 0;
};

describe('CLI command', () => {
    describe('init', () => {
        beforeEach(() => {
            process.chdir(`${TEST_ROOT}/testbench/test-init`);
        });
        afterEach(() => {
            removeSync('./.velocitas.json');
            removeSync(VELOCITAS_HOME);
            removeSync('./gen');
        });
        it('should be able to clean init a project with an actual version of .velocitas.json', async () => {
            copySync('./.velocitasNew.json', './.velocitas.json');
            const initOutput = spawnSync(VELOCITAS_PROCESS, ['init'], { encoding: DEFAULT_BUFFER_ENCODING });
            expect(initOutput.status).to.equal(0);

            const packageIndex = JSON.parse(readFileSync('./.velocitas.json', 'utf8'));
            const projectConfig = ProjectConfig.read(packageIndex.cliVersion, './.velocitas.json');

            expect(existsSync(join(ProjectCache.getCacheDir(), 'vehicle_model'))).to.be.true;
            expect(isDirectoryEmpty(join(ProjectCache.getCacheDir(), 'vehicle_model'))).to.be.false;

            for (const projectPackage of projectConfig.getPackages()) {
                expect(existsSync(projectPackage.getPackageDirectoryWithVersion())).to.be.true;
                expect(isDirectoryEmpty(projectPackage.getPackageDirectoryWithVersion())).to.be.false;
            }
        });
        it('should be able to clean init a project with an older version of .velocitas.json', async () => {
            copySync('./.velocitasOld.json', './.velocitas.json');
            const initOutput = spawnSync(VELOCITAS_PROCESS, ['init'], { encoding: DEFAULT_BUFFER_ENCODING });
            expect(initOutput.status).to.equal(0);

            const packageIndex = JSON.parse(readFileSync('./.velocitas.json', 'utf8'));
            const projectConfig = ProjectConfig.read(packageIndex.cliVersion, './.velocitas.json');
            expect(existsSync('./gen')).to.be.true;
            expect(isDirectoryEmpty('./gen')).to.be.false;

            for (const projectPackage of projectConfig.getPackages()) {
                expect(existsSync(projectPackage.getPackageDirectoryWithVersion())).to.be.true;
                expect(isDirectoryEmpty(projectPackage.getPackageDirectoryWithVersion())).to.be.false;
            }
        });
        it('should fail with component validation of .velocitas.json', async () => {
            copySync('./.velocitasInvalidComponent.json', './.velocitas.json');
            const initOutput = spawnSync(VELOCITAS_PROCESS, ['init'], { encoding: DEFAULT_BUFFER_ENCODING });
            expect(initOutput.status).to.equal(1);
        });
    });
});
