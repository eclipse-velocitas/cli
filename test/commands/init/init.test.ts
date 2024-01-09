// Copyright (c) 2022-2023 Contributors to the Eclipse Foundation
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
import * as fs from 'fs';
import { velocitasConfigMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore, userHomeDir } from '../../utils/mockfs';
import * as gitModule from 'simple-git';
import * as exec from '../../../src/modules/exec';
import sinon from 'sinon';
import { simpleGitInstanceMock } from '../../helpers/simpleGit';

describe('init', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', sinon.stub().returns(simpleGitInstanceMock()))
        .command(['init'])
        .it('downloads packages from preconfigured velocitas.json', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(
                `... Downloading package: '${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version}'`,
            );
            expect(ctx.stdout).to.contain(
                `... Downloading package: '${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version}'`,
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].name}`)).to.be.true;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedComponents: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['init', '-v'])
        .it('skips downloading because package is already installed', (ctx) => {
            console.error(ctx.stdout);
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version}' already initialized.`,
            );
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version}' already initialized.`,
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].name}`)).to.be.true;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedComponents: true, appManifest: false });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['init', '-v'])
        .it('should log warning when no AppManifest.json is found', (ctx) => {
            console.error(ctx.stdout);
            expect(ctx.stdout).to.contain('*** Info ***: No AppManifest found');
        });

    test.do(() => {
        mockFolders();
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['init'])
        .it('creates config file from default velocitas.json', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(
                '... Directory is no velocitas project. Creating .velocitas.json at the root of your repository.',
            );
            expect(fs.existsSync(`${process.cwd()}/.velocitas.json`)).to.be.true;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', sinon.stub().returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', () => {})
        .command(['init'])
        .it('runs post-init hooks', (ctx) => {
            expect(ctx.stdout).to.contain(`... > Running post init hook for 'test-runtime-local'`);
        });
});
