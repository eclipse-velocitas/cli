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
import { ProjectConfigLock } from '../../../src/modules/project-config';
import { CliFileSystem } from '../../../src/utils/fs-bridge';
import { simpleGitInstanceMock } from '../../helpers/simpleGit';
import { velocitasConfigMock } from '../../utils/mockConfig';
import { installedCorePackage, installedRuntimePackage, installedSetupPackage, mockFolders, userHomeDir } from '../../utils/mockfs';

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
            expect(ctx.stdout).to.contain(`... Downloading package: '${installedRuntimePackage.repo}:${installedRuntimePackage.version}'`);
            expect(ctx.stdout).to.contain(`... Downloading package: '${installedSetupPackage.repo}:${installedRuntimePackage.version}'`);
            expect(
                CliFileSystem.existsSync(
                    `${userHomeDir}/.velocitas/packages/${installedRuntimePackage.repo}/${installedRuntimePackage.version}`,
                ),
            ).to.be.true;
            expect(
                CliFileSystem.existsSync(
                    `${userHomeDir}/.velocitas/packages/${installedSetupPackage.repo}/${installedSetupPackage.version}`,
                ),
            ).to.be.true;
            expect(ProjectConfigLock.isAvailable()).to.be.true;
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
                `... Resolved '${installedRuntimePackage.repo}:${velocitasConfigMock.packages[0].version}' to version: '${installedRuntimePackage.version}'`,
            );
            expect(ctx.stdout).to.contain(`... '${installedRuntimePackage.repo}:${installedRuntimePackage.version}' already installed.`);
            expect(ctx.stdout).to.contain(
                `... Resolved '${installedSetupPackage.repo}:${velocitasConfigMock.packages[1].version}' to version: '${installedSetupPackage.version}'`,
            );
            expect(ctx.stdout).to.contain(`... '${installedSetupPackage.repo}:${installedSetupPackage.version}' already installed.`);
            expect(ctx.stdout).to.contain(
                `... Resolved '${installedCorePackage.repo}:${velocitasConfigMock.packages[2].version}' to version: '${installedCorePackage.version}'`,
            );
            expect(ctx.stdout).to.contain(`... '${installedCorePackage.repo}:${installedCorePackage.version}' already installed.`);
            expect(
                CliFileSystem.existsSync(
                    `${userHomeDir}/.velocitas/packages/${installedRuntimePackage.repo}/${installedRuntimePackage.version}`,
                ),
            ).to.be.true;
            expect(
                CliFileSystem.existsSync(
                    `${userHomeDir}/.velocitas/packages/${installedSetupPackage.repo}/${installedSetupPackage.version}`,
                ),
            ).to.be.true;
            expect(
                CliFileSystem.existsSync(`${userHomeDir}/.velocitas/packages/${installedCorePackage.repo}/${installedCorePackage.version}`),
            ).to.be.true;
            expect(ProjectConfigLock.isAvailable()).to.be.true;
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
            expect(ProjectConfigLock.isAvailable()).to.be.true;
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
