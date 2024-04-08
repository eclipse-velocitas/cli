// Copyright (c) 2022-2024 Contributors to the Eclipse Foundation
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
import * as gitModule from 'simple-git';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Init from '../../../src/commands/init';
import * as upgrade from '../../../src/commands/upgrade';
import { simpleGitInstanceMock } from '../../helpers/simpleGit';
import { installedCorePackage, installedRuntimePackage, installedSetupPackage, mockFolders } from '../../utils/mockfs';

const mockedNewVersionTag = 'v2.0.0';
const mockedLowerVersionTag = 'v1.0.0';
const mockedHigherVersionTag = 'v1.1.2';

describe('upgrade command', () => {
    describe('upgrade --dry-run', () => {
        test.do(() => {
            mockFolders({ velocitasConfig: true });
        })
            .stdout()
            .command(['upgrade', '--dry-run'])
            .catch((err) => expect(err.message).to.match(/No .velocitas-lock.json found. Please 'velocitas init' first!/))
            .it('checking for upgrades in dry-run - no .velocitas-lock.json found');

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
            .command(['upgrade', '--dry-run'])
            .it('checking for upgrades in dry-run - up to date', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(`... ${installedRuntimePackage.repo}:${installedRuntimePackage.version} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${installedSetupPackage.repo}:${installedSetupPackage.version} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${installedCorePackage.repo}:${installedCorePackage.version} → up to date!`);
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
            .command(['upgrade', '--dry-run'])
            .it('checking for upgrades in dry-run - respect version boundaries - up to date', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(`... ${installedRuntimePackage.repo}:${installedRuntimePackage.version} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${installedSetupPackage.repo}:${installedSetupPackage.version} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${installedCorePackage.repo}:${installedCorePackage.version} → up to date!`);
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedHigherVersionTag)))
            .command(['upgrade', '--dry-run'])
            .it('checking for upgrades in dry-run - respect version boundaries - can be updated', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(
                    `... ${installedRuntimePackage.repo}:${installedRuntimePackage.version} → ${mockedHigherVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${installedSetupPackage.repo}:${installedSetupPackage.version} → ${mockedHigherVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${installedCorePackage.repo}:${installedCorePackage.version} → ${mockedHigherVersionTag}`,
                );
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedLowerVersionTag)))
            .command(['upgrade', '--dry-run', '--ignore-bounds'])
            .it('checking for upgrades in dry-run - ignoring version boundaries - up to date', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(`... ${installedRuntimePackage.repo}:${installedRuntimePackage.version} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${installedSetupPackage.repo}:${installedSetupPackage.version} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${installedCorePackage.repo}:${installedCorePackage.version} → up to date!`);
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
            .command(['upgrade', '--dry-run', '--ignore-bounds'])
            .it('checking for upgrades in dry-run - ignoring version boundaries - can be updated', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(
                    `... ${installedRuntimePackage.repo}:${installedRuntimePackage.version} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${installedSetupPackage.repo}:${installedSetupPackage.version} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(`... ${installedCorePackage.repo}:${installedCorePackage.version} → ${mockedNewVersionTag}`);
            });
    });
    describe('upgrade', () => {
        test.do(() => {
            mockFolders({ velocitasConfig: true });
        })
            .stdout()
            .command(['upgrade'])
            .catch((err) => expect(err.message).to.match(/No .velocitas-lock.json found. Please 'velocitas init' first!/))
            .it('checking for upgrades - no .velocitas-lock.json found');

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(upgrade.default.prototype, 'checkUpdate', (stub) => stub.throws())
            .command(['upgrade'])
            .catch((err) => expect(err.message).to.match(/Error during upgrade:/))
            .it('checking for upgrades - error during checkUpdate');

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
            .command(['upgrade'])
            .it('checking for upgrades - up to date', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(`... ${installedRuntimePackage.repo}:${installedRuntimePackage.version} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${installedSetupPackage.repo}:${installedSetupPackage.version} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${installedCorePackage.repo}:${installedCorePackage.version} → up to date!`);
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
            .command(['upgrade'])
            .it('checking for upgrades - respect version boundaries - up to date', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(`... ${installedRuntimePackage.repo}:${installedRuntimePackage.version} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${installedSetupPackage.repo}:${installedSetupPackage.version} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${installedCorePackage.repo}:${installedCorePackage.version} → up to date!`);
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
            .stub(Init.prototype, 'run', (stub) => stub.returns(''))
            .command(['upgrade', '--ignore-bounds', '--init', '-v'])
            .it('checking for upgrades - ignoring version boundaries - can be updated', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(
                    `... ${installedRuntimePackage.repo}:${installedRuntimePackage.version} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${installedSetupPackage.repo}:${installedSetupPackage.version} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(`... ${installedCorePackage.repo}:${installedCorePackage.version} → ${mockedNewVersionTag}`);
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
            .command(['upgrade', '--ignore-bounds'])
            .it('checking for upgrades - ignoring version boundaries - can be updated', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(
                    `... ${installedRuntimePackage.repo}:${installedRuntimePackage.version} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${installedSetupPackage.repo}:${installedSetupPackage.version} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(`... ${installedCorePackage.repo}:${installedCorePackage.version} → ${mockedNewVersionTag}`);
                expect(ctx.stdout).to.contain("Update available: Call 'velocitas init'");
            });
    });
});
