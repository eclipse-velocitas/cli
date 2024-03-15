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

import { ux } from '@oclif/core';
import { expect, test } from '@oclif/test';
import * as fs from 'fs';
import * as packageModule from '../../../src/modules/package';
import { ProjectConfigOptions } from '../../../src/modules/project-config';
import { velocitasConfigMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore, userHomeDir } from '../../utils/mockfs';
import * as gitModule from 'simple-git';
import { simpleGitInstanceMock } from '../../helpers/simpleGit';

const mockedNewVersionTag = 'v2.0.0';

describe('upgrade', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .command(['upgrade', '--dry-run'])
        .it('checking for upgrades in dry-run - no installed sources found', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[0].repo}:${velocitasConfigMock.packages[0].version} found`,
            );
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[1].repo}:${velocitasConfigMock.packages[1].version} found`,
            );
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedComponents: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .command(['upgrade', '--dry-run'])
        .it('checking for upgrades in dry-run - up to date', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(`... '${velocitasConfigMock.packages[0].repo}' is up to date!`);
            expect(ctx.stdout).to.contain(`... '${velocitasConfigMock.packages[1].repo}' is up to date!`);
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedComponents: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
        .command(['upgrade', '--dry-run'])
        .it('checking for upgrades in dry-run - can be updated', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[0].repo}' is currently at ${velocitasConfigMock.packages[0].version}, can be updated to ${mockedNewVersionTag}`,
            );
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[1].repo}' is currently at ${velocitasConfigMock.packages[1].version}, can be updated to ${mockedNewVersionTag}`,
            );
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(ux, 'prompt', (stub) => stub.returns('y'))
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .command(['upgrade'])
        .it('checking for upgrades - no installed sources found - download', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[0].repo}:${velocitasConfigMock.packages[0].version} found`,
            );
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[1].repo}:${velocitasConfigMock.packages[1].version} found`,
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].repo}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].repo}`)).to.be.true;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stderr()
        .stdout()
        .stub(ux, 'prompt', (stub) => stub.returns('y'))
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .stub(packageModule.PackageConfig.prototype, 'downloadPackageVersion', () => {
            throw new Error('Error in downloading package');
        })
        .command(['upgrade'])
        .catch(`Error during upgrade: 'Error: Error in downloading package'`)
        .it('catches error during upgrade', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[0].repo}:${velocitasConfigMock.packages[0].version} found`,
            );
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(ux, 'prompt', (stub) => stub.returns('n'))
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .command(['upgrade'])
        .it('checking for upgrades - no installed sources found - do nothing', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[0].repo}:${velocitasConfigMock.packages[0].version} found`,
            );
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[1].repo}:${velocitasConfigMock.packages[1].version} found`,
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].repo}/_cache`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].repo}/_cache`)).to.be.true;
            expect(
                fs.existsSync(
                    `${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].repo}/${velocitasConfigMock.packages[0].version}`,
                ),
            ).to.be.false;
            expect(
                fs.existsSync(
                    `${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].repo}/${velocitasConfigMock.packages[1].version}`,
                ),
            ).to.be.false;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedComponents: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .command(['upgrade'])
        .it('checking for upgrades - up to date', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(`... '${velocitasConfigMock.packages[0].repo}' is up to date!`);
            expect(ctx.stdout).to.contain(`... '${velocitasConfigMock.packages[1].repo}' is up to date!`);
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedComponents: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(ux, 'prompt', (stub) => stub.returns('y'))
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
        .command(['upgrade'])
        .it('checking for upgrades - can be updated - download', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[0].repo}' is currently at ${velocitasConfigMock.packages[0].version}, can be updated to ${mockedNewVersionTag}`,
            );
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[1].repo}' is currently at ${velocitasConfigMock.packages[1].version}, can be updated to ${mockedNewVersionTag}`,
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].repo}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].repo}`)).to.be.true;
            const newVelocitasConfig: ProjectConfigOptions = JSON.parse(
                fs.readFileSync(`${process.cwd()}/.velocitas.json`, { encoding: 'utf8', flag: 'r' }),
            );
            expect(newVelocitasConfig.packages[0].version).to.be.equal(mockedNewVersionTag);
            expect(newVelocitasConfig.packages[1].version).to.be.equal(mockedNewVersionTag);
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedComponents: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(ux, 'prompt', (stub) => stub.returns('n'))
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock(mockedNewVersionTag)))
        .command(['upgrade'])
        .it('checking for upgrades - can be updated - do nothing', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[0].repo}' is currently at ${velocitasConfigMock.packages[0].version}, can be updated to ${mockedNewVersionTag}`,
            );
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[1].repo}' is currently at ${velocitasConfigMock.packages[1].version}, can be updated to ${mockedNewVersionTag}`,
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].repo}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].repo}`)).to.be.true;
        });
});
