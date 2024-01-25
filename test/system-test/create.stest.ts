// Copyright (c) 2023-2024 Contributors to the Eclipse Foundation
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
import { existsSync, readFileSync, readdirSync, copySync, removeSync } from 'fs-extra';
import { homedir } from 'node:os';
import path, { join } from 'path';
import { cwd } from 'process';
import { DEFAULT_BUFFER_ENCODING } from '../../src/modules/constants';

const VELOCITAS_PROCESS = join('..', '..', '..', process.env['VELOCITAS_PROCESS'] ? process.env['VELOCITAS_PROCESS'] : 'velocitas');
const TEST_ROOT = cwd();
const VELOCITAS_HOME = `${homedir()}/.velocitas`;

describe('CLI command', () => {
    // describe('create', () => {
    //     beforeEach(async () => {
    //         // When using this as real "system test"
    //         // the next two lines are not necessary
    //         const sdkConfig = new SdkConfig('python');
    //         await coreDownloader(sdkConfig).downloadPackage({ checkVersionOnly: false });
    //         process.chdir(`${TEST_ROOT}/testbench/test-create`);
    //         copySync('./sdk', `${VELOCITAS_HOME}/sdk/python/latest`);
    //         process.chdir(`${TEST_ROOT}/testbench/test-create/vehicle-app-template`);
    //     });
    //     afterEach(() => {
    //         process.chdir(`${TEST_ROOT}/testbench/test-create/vehicle-app-template`);
    //         readdirSync(`${TEST_ROOT}/testbench/test-create/vehicle-app-template`).forEach((file) => {
    //             const fileDir = path.join(`${TEST_ROOT}/testbench/test-create/vehicle-app-template`, file);
    //             if (file !== 'package-index.json') {
    //                 removeSync(fileDir);
    //             }
    //         });
    //     });
    //     it('should be able to create a project', async () => {
    //         spawnSync(VELOCITAS_PROCESS, ['create', '-n', 'MyApp', '-c', 'vehicle-app-python-core'], {
    //             encoding: DEFAULT_BUFFER_ENCODING,
    //         });
    //         const creationConfigFile = readFileSync(
    //             `${VELOCITAS_HOME}/sdk/python/latest/.project-creation/config.json`,
    //             DEFAULT_BUFFER_ENCODING,
    //         );
    //         const creationConfig = JSON.parse(creationConfigFile);
    //         const fileCheck: boolean[] = [];
    //         creationConfig.files.forEach((file: string) => {
    //             file = file.replace('.project-creation/', '');
    //             fileCheck.push(existsSync(`${TEST_ROOT}/testbench/test-create/vehicle-app-template/${file}`));
    //         });
    //         expect(fileCheck.every((v: boolean) => v === true)).to.be.true;
    //         expect(existsSync(`${TEST_ROOT}/testbench/test-create/vehicle-app-template/.velocitas.json`)).to.be.true;
    //         expect(existsSync(`${TEST_ROOT}/testbench/test-create/vehicle-app-template/app/AppManifest.json`)).to.be.true;
    //     });
    // });
});
