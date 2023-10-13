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

import { expect, test } from '@oclif/test';
import { packageIndexMock, velocitasConfigMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore } from '../../utils/mockfs';
import * as gitModule from 'simple-git';
import * as exec from '../../../src/modules/exec';
import sinon from 'sinon';
import { simpleGitInstanceMock } from '../../helpers/simpleGit';
import { ProjectConfig } from '../../../src/modules/project-config';
import { readAppManifest } from '../../../src/modules/app-manifest';
const inquirer = require('inquirer');

const TEST_APP_NAME = 'TestApp';
const TEST_EXPOSED_INTERFACE_TYPE = packageIndexMock[0].exposedInterfaces[0].type;
const TEST_EXPOSED_INTERFACE_ARG_NAME_1 = packageIndexMock[0].exposedInterfaces[0].args[0].id;
const TEST_EXPOSED_INTERFACE_ARG_DEFAULT_1 = packageIndexMock[0].exposedInterfaces[0].args[0].default;
const TEST_EXPOSED_INTERFACE_ARG_NAME_2 = packageIndexMock[0].exposedInterfaces[0].args[1].id;
const TEST_EXPOSED_INTERFACE_ARG_DEFAULT_2 = packageIndexMock[0].exposedInterfaces[0].args[1].default as string;
const TEST_PACKAGE_URI = packageIndexMock[0].package;
const TEST_PACKAGE_NAME = velocitasConfigMock.packages[0].name;
const TEST_PACKAGE_VERSION = velocitasConfigMock.packages[0].version;

const EXPECTED_NON_INTERACTIVE_STDOUT = `Creating a new Velocitas project ...
... Project for Vehicle Application '${TEST_APP_NAME}' created!
Initializing Velocitas packages ...
... Downloading package: '${TEST_PACKAGE_NAME}:${TEST_PACKAGE_VERSION}'
Syncing Velocitas components!
`;

const EXPECTED_INTERACTIVE_STDOUT = `Creating a new Velocitas project ...
Interactive project creation started
... Project for Vehicle Application '${TEST_APP_NAME}' created!
Initializing Velocitas packages ...
... Downloading package: '${TEST_PACKAGE_NAME}:${TEST_PACKAGE_VERSION}'
Syncing Velocitas components!
`;

describe('create', () => {
    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', sinon.stub().returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', () => {})
        .stub(exec, 'awaitSpawn', () => {
            return { exitCode: 0 };
        })
        .command(['create', '-n', TEST_APP_NAME, '-l', 'test'])
        .it('creates a project with provided flags and generates .velocitas.json and AppManifest', (ctx) => {
            expect(ctx.stdout).to.equal(EXPECTED_NON_INTERACTIVE_STDOUT);
            expect(ProjectConfig.isAvailable()).to.be.true;
            expect(readAppManifest()).to.not.be.undefined;

            const velocitasConfig = ProjectConfig.read('v0.0.0');
            expect(velocitasConfig.packages[0].repo).to.be.equal(TEST_PACKAGE_URI);
            expect(velocitasConfig.packages[0].version).to.be.equal(TEST_PACKAGE_VERSION);
            expect(velocitasConfig.variables.get('language')).to.be.equal('test');

            const appManifest = readAppManifest();
            expect(appManifest.name).to.be.equal(TEST_APP_NAME);
            expect(appManifest.interfaces).to.be.empty;
        });

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', sinon.stub().returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', () => {})
        .command(['create', '-n', TEST_APP_NAME, '-l', 'test'])
        .catch('Unable to execute create script!')
        .it('throws error when project-creation script cannot be executed');

    test.do(() => {
        mockFolders();
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['create'])
        .catch(`No package-index.json found.`)
        .it('throws error when package-index.json is not found');

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['create', '-l', 'test'])
        .catch(`Missing required flag 'name'`)
        .it('throws error when required name flag is missing');

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['create', '-n', TEST_APP_NAME])
        .catch(`Missing required flag 'language'`)
        .it('throws error when required language flag is missing');

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', sinon.stub().returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', () => {})
        .stub(exec, 'awaitSpawn', () => {
            return { exitCode: 0 };
        })
        .stub(inquirer, 'prompt', () => {
            return {
                name: TEST_APP_NAME,
                language: 'test',
                exampleQuestion: false,
                interface: [TEST_EXPOSED_INTERFACE_TYPE],
            };
        })
        .command(['create'])
        .it('creates a project in interactive mode without example and generates .velocitas.json and AppManifest with defaults', (ctx) => {
            expect(ctx.stdout).to.equal(EXPECTED_INTERACTIVE_STDOUT);
            expect(ProjectConfig.isAvailable()).to.be.true;
            expect(readAppManifest()).to.not.be.undefined;

            const velocitasConfig = ProjectConfig.read('v0.0.0');
            expect(velocitasConfig.packages[0].repo).to.be.equal(TEST_PACKAGE_URI);
            expect(velocitasConfig.packages[0].version).to.be.equal(TEST_PACKAGE_VERSION);
            expect(velocitasConfig.variables.get('language')).to.be.equal('test');

            const appManifest = readAppManifest();
            expect(appManifest.name).to.be.equal(TEST_APP_NAME);
            expect(appManifest.interfaces[0].type).to.be.equal(TEST_EXPOSED_INTERFACE_TYPE);
            expect(appManifest.interfaces[0].config[TEST_EXPOSED_INTERFACE_ARG_NAME_1]).to.be.equal(TEST_EXPOSED_INTERFACE_ARG_DEFAULT_1);
            expect(appManifest.interfaces[0].config[TEST_EXPOSED_INTERFACE_ARG_NAME_2]).to.be.deep.equal(
                JSON.parse(TEST_EXPOSED_INTERFACE_ARG_DEFAULT_2),
            );
        });

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', sinon.stub().returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', () => {})
        .stub(exec, 'awaitSpawn', () => {
            return { exitCode: 0 };
        })
        .stub(inquirer, 'prompt', () => {
            return {
                name: TEST_APP_NAME,
                language: 'test',
                exampleQuestion: false,
                interface: [],
            };
        })
        .command(['create'])
        .it(
            'creates a project in interactive mode with either example or interfaces and generates .velocitas.json and AppManifest correctly',
            (ctx) => {
                expect(ctx.stdout).to.equal(EXPECTED_INTERACTIVE_STDOUT);
                expect(ProjectConfig.isAvailable()).to.be.true;
                expect(readAppManifest()).to.not.be.undefined;

                const velocitasConfig = ProjectConfig.read('v0.0.0');
                expect(velocitasConfig.packages[0].repo).to.be.equal(TEST_PACKAGE_URI);
                expect(velocitasConfig.packages[0].version).to.be.equal(TEST_PACKAGE_VERSION);
                expect(velocitasConfig.variables.get('language')).to.be.equal('test');

                const appManifest = readAppManifest();
                expect(appManifest.name).to.be.equal(TEST_APP_NAME);
                expect(appManifest.interfaces).to.be.empty;
            },
        );

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['create', '-l', 'test'])
        .catch(`Missing required flag 'name'`)
        .it('throws error when required name flag is missing');

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', sinon.stub().returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', () => {})
        .stub(exec, 'awaitSpawn', () => {
            return { exitCode: 0 };
        })
        .stub(inquirer, 'prompt', () => {
            return {
                name: TEST_APP_NAME,
                language: 'no-example',
                exampleQuestion: true,
            };
        })
        .command(['create'])
        .catch(`No example for your chosen language 'no-example' available`)
        .it('throws error when no example exists for chosen language');

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['create', '-n', 'test', '-e', 'example'])
        .catch(`Flags 'name' and 'example' are mutually exclusive!`)
        .it('throws error when name and example flags are used in parallel');

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', sinon.stub().returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', () => {})
        .stub(exec, 'awaitSpawn', () => {
            return { exitCode: 0 };
        })
        .stub(inquirer, 'prompt', () => {
            return {
                name: TEST_APP_NAME,
                language: 'test',
                exampleQuestion: false,
                interface: [TEST_EXPOSED_INTERFACE_TYPE],
                [TEST_EXPOSED_INTERFACE_ARG_NAME_1]: 'testNotDefault',
            };
        })
        .command(['create'])
        .it(
            'creates a project in interactive mode without example and generates .velocitas.json and AppManifest without defaults',
            (ctx) => {
                expect(ctx.stdout).to.equal(EXPECTED_INTERACTIVE_STDOUT);
                expect(ProjectConfig.isAvailable()).to.be.true;
                expect(readAppManifest()).to.not.be.undefined;

                const velocitasConfig = ProjectConfig.read('v0.0.0');
                expect(velocitasConfig.packages[0].repo).to.be.equal(TEST_PACKAGE_URI);
                expect(velocitasConfig.packages[0].version).to.be.equal(TEST_PACKAGE_VERSION);
                expect(velocitasConfig.variables.get('language')).to.be.equal('test');

                const appManifest = readAppManifest();
                expect(appManifest.name).to.be.equal(TEST_APP_NAME);
                expect(appManifest.interfaces[0].type).to.be.equal(TEST_EXPOSED_INTERFACE_TYPE);
                expect(appManifest.interfaces[0].config[TEST_EXPOSED_INTERFACE_ARG_NAME_1]).to.be.equal('testNotDefault');
            },
        );

    test.do(() => {
        mockFolders({ packageIndex: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stub(gitModule, 'simpleGit', sinon.stub().returns(simpleGitInstanceMock()))
        .stub(exec, 'runExecSpec', () => {})
        .stub(exec, 'awaitSpawn', () => {
            return { exitCode: 0 };
        })
        .stub(inquirer, 'prompt', () => {
            return {
                language: 'test',
                exampleQuestion: true,
                exampleUse: TEST_APP_NAME,
            };
        })
        .command(['create'])
        .it('creates a project in interactive mode with example and generates .velocitas.json and AppManifest', (ctx) => {
            expect(ctx.stdout).to.equal(EXPECTED_INTERACTIVE_STDOUT);
            expect(ProjectConfig.isAvailable()).to.be.true;
            expect(readAppManifest()).to.not.be.undefined;

            const velocitasConfig = ProjectConfig.read('v0.0.0');
            expect(velocitasConfig.packages[0].repo).to.be.equal(TEST_PACKAGE_URI);
            expect(velocitasConfig.packages[0].version).to.be.equal(TEST_PACKAGE_VERSION);
            expect(velocitasConfig.variables.get('language')).to.be.equal('test');

            const appManifest = readAppManifest();
            expect(appManifest.name).to.be.equal(TEST_APP_NAME);
        });
});
