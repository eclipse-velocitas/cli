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
import * as exec from '../../../src/modules/exec';
import { ProjectConfigLockReader } from '../../../src/modules/projectConfig/projectConfigFileReader';
import { CliFileSystem } from '../../../src/utils/fs-bridge';
import { simpleGitInstanceMock } from '../../helpers/simpleGit';
import { corePackageInfoMock, runtimePackageInfoMock, setupPackageInfoMock } from '../../utils/mockConfig';
import { mockFolders, userHomeDir } from '../../utils/mockfs';

describe('init', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', (stub) => stub.returns({}))
        .command(['init'])
        .it('downloads packages from preconfigured velocitas.json', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(
                `... Downloading package: '${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion}'`,
            );
            expect(ctx.stdout).to.contain(
                `... Downloading package: '${setupPackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion}'`,
            );
            expect(
                CliFileSystem.existsSync(
                    `${userHomeDir}/.velocitas/packages/${runtimePackageInfoMock.repo}/${runtimePackageInfoMock.resolvedVersion}`,
                ),
            ).to.be.true;
            expect(
                CliFileSystem.existsSync(
                    `${userHomeDir}/.velocitas/packages/${setupPackageInfoMock.repo}/${setupPackageInfoMock.resolvedVersion}`,
                ),
            ).to.be.true;
            expect(ProjectConfigLockReader.isLockAvailable()).to.be.true;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedComponents: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', (stub) => stub.returns({}))
        .command(['init', '-v'])
        .it('skips downloading because package is already installed', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(
                `... Resolved '${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.versionIdentifier}' to version: '${runtimePackageInfoMock.resolvedVersion}'`,
            );
            expect(ctx.stdout).to.contain(
                `... '${runtimePackageInfoMock.repo}:${runtimePackageInfoMock.resolvedVersion}' already installed.`,
            );
            expect(ctx.stdout).to.contain(
                `... Resolved '${setupPackageInfoMock.repo}:${setupPackageInfoMock.versionIdentifier}' to version: '${setupPackageInfoMock.resolvedVersion}'`,
            );
            expect(ctx.stdout).to.contain(`... '${setupPackageInfoMock.repo}:${setupPackageInfoMock.resolvedVersion}' already installed.`);
            expect(ctx.stdout).to.contain(
                `... Resolved '${corePackageInfoMock.repo}:${corePackageInfoMock.versionIdentifier}' to version: '${corePackageInfoMock.resolvedVersion}'`,
            );
            expect(ctx.stdout).to.contain(`... '${corePackageInfoMock.repo}:${corePackageInfoMock.resolvedVersion}' already installed.`);
            expect(
                CliFileSystem.existsSync(
                    `${userHomeDir}/.velocitas/packages/${runtimePackageInfoMock.repo}/${runtimePackageInfoMock.resolvedVersion}`,
                ),
            ).to.be.true;
            expect(
                CliFileSystem.existsSync(
                    `${userHomeDir}/.velocitas/packages/${setupPackageInfoMock.repo}/${setupPackageInfoMock.resolvedVersion}`,
                ),
            ).to.be.true;
            expect(
                CliFileSystem.existsSync(
                    `${userHomeDir}/.velocitas/packages/${corePackageInfoMock.repo}/${corePackageInfoMock.resolvedVersion}`,
                ),
            ).to.be.true;
            expect(ProjectConfigLockReader.isLockAvailable()).to.be.true;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true, appManifest: false });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .command(['init', '-v', '--no-hooks'])
        .it('should log warning when no AppManifest.json is found', (ctx) => {
            console.error(ctx.stdout);
            expect(ctx.stdout).to.contain('*** Info ***: No AppManifest found');
        });

    test.do(() => {
        mockFolders();
    })
        .stdout()
        .command(['init'])
        .it('creates config file from default velocitas.json', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(
                '... Directory is no velocitas project. Creating .velocitas.json at the root of your repository.',
            );
            expect(CliFileSystem.existsSync(`${process.cwd()}/.velocitas.json`)).to.be.true;
            expect(ProjectConfigLockReader.isLockAvailable()).to.be.true;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', (stub) => stub.returns({}))
        .command(['init'])
        .it('runs post-init hooks', (ctx) => {
            expect(ctx.stdout).to.contain(`... > Running post init hook for 'test-runtime-local'`);
        });
});
