// Copyright (c) 2022-2025 Contributors to the Eclipse Foundation
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
import { corePackageInfoMock, runtimePackageInfoMock, setupPackageInfoMock } from '../../utils/mockConfig';
import { mockFolders } from '../../utils/mockfs';

const mockedNewVersionTag = 'v2.0.0';
const mockedLowerVersionTag = 'v1.0.0';
const mockedHigherVersionTag = 'v1.1.2';

describe('upgrade command', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .stdout()
        .command(['upgrade'])
        .catch((err) => expect(err.message).to.match(/No .velocitas-lock.json found. Please 'velocitas init' first!/))
        .it('should throw when no .velocitas-lock.json is present');

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
    })
        .stdout()
        .stub(upgrade.default.prototype, 'updatePackageIfAvailable', (stub) => stub.throws())
        .command(['upgrade'])
        .catch((err) => expect(err.message).to.match(/Error during upgrade:/))
        .it('should throw when updatePackageIfAvailable fails');

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .command(['upgrade'])
        .it('should report configured package version specifiers are up to date', (ctx) => {
            expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
            expect(ctx.stdout).to.contain(`... ${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion} → up to date!`);
            expect(ctx.stdout).to.contain(`... ${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion} → up to date!`);
            expect(ctx.stdout).to.contain(`... ${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion} → up to date!`);
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
        .command(['upgrade'])
        .it('should report configured package version specifiers are up to date based on configured version range', (ctx) => {
            expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
            expect(ctx.stdout).to.contain(`... ${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion} → up to date!`);
            expect(ctx.stdout).to.contain(`... ${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion} → up to date!`);
            expect(ctx.stdout).to.contain(`... ${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion} → up to date!`);
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedHigherVersionTag)))
        .command(['upgrade'])
        .it('should upgrade configured package version specifiers based on configured version range', (ctx) => {
            expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
            expect(ctx.stdout).to.contain(
                `... ${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion} → ${mockedHigherVersionTag}`,
            );
            expect(ctx.stdout).to.contain(
                `... ${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion} → ${mockedHigherVersionTag}`,
            );
            expect(ctx.stdout).to.contain(
                `... ${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion} → ${mockedHigherVersionTag}`,
            );
            expect(ctx.stdout).to.contain("Update available: Call 'velocitas init'");
        });

    describe('with flags', () => {
        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
            .command(['upgrade', '--ignore-bounds'])
            .it('should upgrade configured package version specifiers to latest versions', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(
                    `... ${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain("Update available: Call 'velocitas init'");
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true });
        })
            .stdout()
            .command(['upgrade', '--dry-run'])
            .catch((err) => expect(err.message).to.match(/No .velocitas-lock.json found. Please 'velocitas init' first!/))
            .it('should throw when no .velocitas-lock.json is present');

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
            .command(['upgrade', '--dry-run'])
            .it('should report configured package version specifiers are up to date', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(`... ${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion} → up to date!`);
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
            .command(['upgrade', '--dry-run'])
            .it('should report configured package version specifiers are up to date based on configured version range', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(`... ${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion} → up to date!`);
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedHigherVersionTag)))
            .command(['upgrade', '--dry-run'])
            .it('should report configured package version specifiers can be updated based on configured version range', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(
                    `... ${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion} → ${mockedHigherVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion} → ${mockedHigherVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion} → ${mockedHigherVersionTag}`,
                );
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedLowerVersionTag)))
            .command(['upgrade', '--dry-run', '--ignore-bounds'])
            .it('should report configured package version specifiers are up to date according to all available versions', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(`... ${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion} → up to date!`);
                expect(ctx.stdout).to.contain(`... ${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion} → up to date!`);
            });

        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
            .command(['upgrade', '--dry-run', '--ignore-bounds'])
            .it('should report configured package version specifiers can be updated according to all available versions', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(
                    `... ${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion} → ${mockedNewVersionTag}`,
                );
            });
        test.do(() => {
            mockFolders({ velocitasConfig: true, velocitasConfigLock: true });
        })
            .stdout()
            .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
            .stub(Init.prototype, 'run', (stub) => stub.returns(''))
            .command(['upgrade', '--ignore-bounds', '--init', '-v'])
            .it('should upgrade configured package version specifiers and initialize new versions', (ctx) => {
                expect(ctx.stdout).to.contain('Checking .velocitas.json for updates!');
                expect(ctx.stdout).to.contain(
                    `... ${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion} → ${mockedNewVersionTag}`,
                );
                expect(ctx.stdout).to.contain(
                    `... ${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion} → ${mockedNewVersionTag}`,
                );
            });
    });
});
