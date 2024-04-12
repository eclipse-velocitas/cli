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

import { expect, test } from '@oclif/test';
import * as gitModule from 'simple-git';
import { AppManifest } from '../../../src/modules/app-manifest';
import * as exec from '../../../src/modules/exec';
import { CoreComponent, ExtensionComponent } from '../../../src/modules/package-index';
import { ProjectConfig } from '../../../src/modules/project-config';
import { simpleGitInstanceMock } from '../../helpers/simpleGit';
import { corePackageInfoMock, packageIndexMock, runtimePackageInfoMock } from '../../utils/mockConfig';
import { mockFolders } from '../../utils/mockfs';

const inquirer = require('inquirer');

const TEST_APP_NAME = 'TestApp';

const TEST_COMPONENT_EXTENSION_ID = packageIndexMock[0].components[0].id;
const TEST_COMPONENT_EXTENSION = packageIndexMock[0].components[0] as ExtensionComponent;

const TEST_COMPONENT_CORE_ID = packageIndexMock[1].components[0].id;
const TEST_COMPONENT_CORE = packageIndexMock[1].components[0] as CoreComponent;

const TEST_COMPONENT_CORE_EXAMPLE = TEST_COMPONENT_CORE.options![0].parameters[0].values![0].id;

const TEST_EXPOSED_INTERFACE_PARAMETER_NAME_1 = TEST_COMPONENT_EXTENSION.parameters![0].id;
const TEST_EXPOSED_INTERFACE_PARAMETER_DEFAULT_1 = TEST_COMPONENT_EXTENSION.parameters![0].default;
const TEST_EXPOSED_INTERFACE_PARAMETER_NAME_2 = TEST_COMPONENT_EXTENSION.parameters![1].id;
const TEST_EXPOSED_INTERFACE_PARAMETER_DEFAULT_2 = TEST_COMPONENT_EXTENSION.parameters![1].default as string;

const TEST_PACKAGE_URI = packageIndexMock[0].package;
const TEST_PACKAGE_NAME = runtimePackageInfoMock.repo;
const TEST_PACKAGE_VERSION = runtimePackageInfoMock.resolvedVersion;

const TEST_MAIN_PACKAGE_URI = packageIndexMock[1].package;
const TEST_MAIN_PACKAGE_NAME = corePackageInfoMock.repo;
const TEST_MAIN_PACKAGE_VERSION = corePackageInfoMock.resolvedVersion;

enum CoreOption {
    fromExample = 0,
    fromScratch = 1,
}

const EXPECTED_NON_INTERACTIVE_STDOUT = `Creating a new Velocitas project ...
... Project for Vehicle Application '${TEST_APP_NAME}' created!
Initializing Velocitas packages ...
... '${TEST_MAIN_PACKAGE_NAME}:${TEST_MAIN_PACKAGE_VERSION}' already installed.
... '${TEST_PACKAGE_NAME}:${TEST_PACKAGE_VERSION}' already installed.
Syncing Velocitas components!
`;

const EXPECTED_INTERACTIVE_STDOUT = (appName: string, withExtension?: string) => `Creating a new Velocitas project ...
Interactive project creation started
${withExtension ? `Configure extension '${withExtension}'\n` : ''}... Project for Vehicle Application '${appName}' created!
Initializing Velocitas packages ...
... '${TEST_MAIN_PACKAGE_NAME}:${TEST_MAIN_PACKAGE_VERSION}' already installed.
... '${TEST_PACKAGE_NAME}:${TEST_PACKAGE_VERSION}' already installed.
Syncing Velocitas components!
`;

describe('create', () => {
    test.do(() => {
        mockFolders({ packageIndex: true, installedComponents: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', (stub) => stub.returns({}))
        .stub(exec, 'awaitSpawn', (stub) => stub.returns({ exitCode: 0 }))
        .command(['create', '-n', TEST_APP_NAME, '-c', TEST_COMPONENT_CORE_ID])
        .it('creates a project with provided flags and generates .velocitas.json and AppManifest', (ctx) => {
            expect(ctx.stdout).to.equal(EXPECTED_NON_INTERACTIVE_STDOUT);
            expect(ProjectConfig.isAvailable()).to.be.true;
            expect(AppManifest.read()).to.not.be.undefined;

            const velocitasConfig = ProjectConfig.read('v0.0.0');
            expect(velocitasConfig.getPackages()[0].repo).to.be.equal(TEST_MAIN_PACKAGE_URI);
            expect(velocitasConfig.getPackages()[0].version).to.be.equal(TEST_MAIN_PACKAGE_VERSION);
            expect(velocitasConfig.getPackages()[1].repo).to.be.equal(TEST_PACKAGE_URI);
            expect(velocitasConfig.getPackages()[1].version).to.be.equal(TEST_PACKAGE_VERSION);

            const appManifest = AppManifest.read();
            expect(appManifest!.name).to.be.equal(TEST_APP_NAME);
            expect(appManifest!.interfaces).to.be.empty;
        });

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .stub(exec, 'awaitSpawn', (stub) => stub.returns({ exitCode: -1 }))
        .command(['create', '-n', TEST_APP_NAME, '-c', TEST_COMPONENT_CORE_ID])
        .catch('Unable to execute create script!')
        .it('throws error when project-creation script cannot be executed');

    test.do(() => {
        mockFolders();
    })
        .stdout()
        .command(['create'])
        .catch(`No package-index.json found.`)
        .it('throws error when package-index.json is not found');

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .stdout()
        .command(['create', '-c', TEST_COMPONENT_CORE_ID])
        .catch(`Missing required flag 'name'`)
        .it('throws error when required name flag is missing');

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .stdout()
        .command(['create', '-n', TEST_APP_NAME])
        .catch(`Missing required flag 'core'`)
        .it('throws error when required core flag is missing');

    test.do(() => {
        mockFolders({ packageIndex: true, installedComponents: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', (stub) => stub.returns({}))
        .stub(exec, 'awaitSpawn', (stub) => stub.returns({ exitCode: 0 }))
        .stub(inquirer, 'prompt', (stub) =>
            stub.returns({
                name: TEST_APP_NAME,
                core: TEST_COMPONENT_CORE,
                coreOptions: CoreOption.fromScratch,
                coreParameter: TEST_APP_NAME,
                extensions: [TEST_COMPONENT_EXTENSION],
                extensionParameter: TEST_EXPOSED_INTERFACE_PARAMETER_DEFAULT_2,
            }),
        )
        .command(['create'])
        .it(
            'creates a project in interactive mode without example and generates .velocitas.json and AppManifest without defaults',
            (ctx) => {
                expect(ctx.stdout).to.equal(EXPECTED_INTERACTIVE_STDOUT(TEST_APP_NAME, TEST_COMPONENT_EXTENSION_ID));
                expect(ProjectConfig.isAvailable()).to.be.true;
                expect(AppManifest.read()).to.not.be.undefined;

                const velocitasConfig = ProjectConfig.read('v0.0.0');
                expect(velocitasConfig.getPackages()[0].repo).to.be.equal(TEST_MAIN_PACKAGE_URI);
                expect(velocitasConfig.getPackages()[0].version).to.be.equal(TEST_MAIN_PACKAGE_VERSION);
                expect(velocitasConfig.getPackages()[1].repo).to.be.equal(TEST_PACKAGE_URI);
                expect(velocitasConfig.getPackages()[1].version).to.be.equal(TEST_PACKAGE_VERSION);

                const appManifest = AppManifest.read();
                expect(appManifest!.name).to.be.equal(TEST_APP_NAME);
                expect(appManifest!.interfaces[0].type).to.be.equal(TEST_COMPONENT_EXTENSION_ID);
                expect(appManifest!.interfaces[0].config[TEST_EXPOSED_INTERFACE_PARAMETER_NAME_1]).to.be.deep.equal(
                    JSON.parse(TEST_EXPOSED_INTERFACE_PARAMETER_DEFAULT_2),
                );
                expect(appManifest!.interfaces[0].config[TEST_EXPOSED_INTERFACE_PARAMETER_NAME_2]).to.be.deep.equal(
                    JSON.parse(TEST_EXPOSED_INTERFACE_PARAMETER_DEFAULT_2),
                );
            },
        );

    test.do(() => {
        mockFolders({ packageIndex: true, installedComponents: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', (stub) => stub.returns({}))
        .stub(exec, 'awaitSpawn', (stub) => stub.returns({ exitCode: 0 }))
        .stub(inquirer, 'prompt', (stub) =>
            stub.returns({
                name: TEST_APP_NAME,
                core: TEST_COMPONENT_CORE,
                coreOptions: CoreOption.fromScratch,
                coreParameter: TEST_APP_NAME,
                extensions: [],
            }),
        )
        .command(['create'])
        .it('creates a project in interactive mode without example and generates .velocitas.json and AppManifest correctly', (ctx) => {
            expect(ctx.stdout).to.equal(EXPECTED_INTERACTIVE_STDOUT(TEST_APP_NAME));
            expect(ProjectConfig.isAvailable()).to.be.true;
            expect(AppManifest.read()).to.not.be.undefined;

            const velocitasConfig = ProjectConfig.read('v0.0.0');
            expect(velocitasConfig.getPackages()[0].repo).to.be.equal(TEST_MAIN_PACKAGE_URI);
            expect(velocitasConfig.getPackages()[0].version).to.be.equal(TEST_MAIN_PACKAGE_VERSION);
            expect(velocitasConfig.getPackages()[1].repo).to.be.equal(TEST_PACKAGE_URI);
            expect(velocitasConfig.getPackages()[1].version).to.be.equal(TEST_PACKAGE_VERSION);

            const appManifest = AppManifest.read();
            expect(appManifest!.name).to.be.equal(TEST_APP_NAME);
            expect(appManifest!.interfaces).to.be.empty;
        });

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .stdout()
        .command(['create', '-n', 'test', '-e', 'example'])
        .catch(`Flags 'name' and 'example' are mutually exclusive!`)
        .it('throws error when name and example flags are used in parallel');

    test.do(() => {
        mockFolders({ packageIndex: true, installedComponents: true });
    })
        .stdout()
        .stub(gitModule, 'simpleGit', (stub) => stub.returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', (stub) => stub.returns({}))
        .stub(exec, 'awaitSpawn', (stub) => stub.returns({ exitCode: 0 }))
        .stub(inquirer, 'prompt', (stub) =>
            stub.returns({
                core: TEST_COMPONENT_CORE,
                coreOptions: CoreOption.fromExample,
                coreParameter: TEST_COMPONENT_CORE_EXAMPLE,
                extensions: [],
            }),
        )
        .command(['create'])
        .it('creates a project in interactive mode with example and generates .velocitas.json and AppManifest correctly', (ctx) => {
            expect(ctx.stdout).to.equal(EXPECTED_INTERACTIVE_STDOUT(TEST_COMPONENT_CORE_EXAMPLE));
            expect(ProjectConfig.isAvailable()).to.be.true;
            expect(AppManifest.read()).to.not.be.undefined;

            const velocitasConfig = ProjectConfig.read('v0.0.0');
            expect(velocitasConfig.getPackages()[0].repo).to.be.equal(TEST_MAIN_PACKAGE_URI);
            expect(velocitasConfig.getPackages()[0].version).to.be.equal(TEST_MAIN_PACKAGE_VERSION);
            expect(velocitasConfig.getPackages()[1].repo).to.be.equal(TEST_PACKAGE_URI);
            expect(velocitasConfig.getPackages()[1].version).to.be.equal(TEST_PACKAGE_VERSION);

            const appManifest = AppManifest.read();
            expect(appManifest!.name).to.be.equal(TEST_COMPONENT_CORE_EXAMPLE);
        });
});
