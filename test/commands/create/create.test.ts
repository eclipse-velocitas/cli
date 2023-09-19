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
import * as fs from 'fs';
import { packageIndexMock, velocitasConfigMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore } from '../../utils/mockfs';
import * as gitModule from 'simple-git';
import * as exec from '../../../src/modules/exec';
import sinon from 'sinon';
import { simpleGitInstanceMock } from '../../helpers/simpleGit';
import { ux } from '@oclif/core';
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
        .stub(exec, 'awaitSpawn', () => {})
        .command(['create', '-n', TEST_APP_NAME, '-l', 'test'])
        .it('creates project with provided flags and generates .velocitas.json and AppManifest', (ctx) => {
            expect(ctx.stdout).to.contain('Creating a new Velocitas project ...');
            expect(ctx.stdout).to.contain(`... Project for Vehicle Application '${TEST_APP_NAME}' created!`);
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(`... Downloading package: '${TEST_PACKAGE_NAME}:${TEST_PACKAGE_VERSION}'`);
            expect(ctx.stdout).to.contain('Syncing Velocitas components!');

            expect(fs.existsSync(`${process.cwd()}/.velocitas.json`)).to.be.true;
            expect(fs.existsSync(`${process.cwd()}/app/AppManifest.json`)).to.be.true;

            const velocitasConfig = ProjectConfig.read();
            expect(velocitasConfig.packages[0].repo).to.be.equal(TEST_PACKAGE_URI);
            expect(velocitasConfig.packages[0].version).to.be.equal(TEST_PACKAGE_VERSION);
            expect(velocitasConfig.variables.get('language')).to.be.equal('test');

            const appManifest = readAppManifest();
            expect(appManifest.name).to.be.equal(TEST_APP_NAME);
            expect(appManifest.interfaces[0].type).to.be.equal(TEST_EXPOSED_INTERFACE_TYPE);
            expect(appManifest.interfaces[0].config[TEST_EXPOSED_INTERFACE_ARG_NAME_1]).to.be.equal(TEST_EXPOSED_INTERFACE_ARG_DEFAULT_1);
        });

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
        .stub(exec, 'awaitSpawn', () => {})
        .stub(ux, 'prompt', () => TEST_APP_NAME)
        .stub(inquirer, 'prompt', () => {
            return {
                language: 'test',
                exampleQuestion: false,
                interface: [TEST_EXPOSED_INTERFACE_TYPE],
            };
        })
        .command(['create'])
        .it('creates project in interactive mode without example and generates .velocitas.json and AppManifest with defaults', (ctx) => {
            expect(ctx.stdout).to.contain('Creating a new Velocitas project ...');
            expect(ctx.stdout).to.contain('Interactive project creation started');
            expect(ctx.stdout).to.contain(`... Project for Vehicle Application '${TEST_APP_NAME}' created!`);
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(`... Downloading package: '${TEST_PACKAGE_NAME}:${TEST_PACKAGE_VERSION}'`);
            expect(ctx.stdout).to.contain('Syncing Velocitas components!');

            expect(fs.existsSync(`${process.cwd()}/.velocitas.json`)).to.be.true;
            expect(fs.existsSync(`${process.cwd()}/app/AppManifest.json`)).to.be.true;

            const velocitasConfig = ProjectConfig.read();
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
        .stub(exec, 'awaitSpawn', () => {})
        .stub(ux, 'prompt', () => TEST_APP_NAME)
        .stub(inquirer, 'prompt', () => {
            return {
                language: 'test',
                exampleQuestion: false,
                interface: [TEST_EXPOSED_INTERFACE_TYPE],
                [TEST_EXPOSED_INTERFACE_ARG_NAME_1]: 'testNotDefault',
            };
        })
        .command(['create'])
        .it('creates project in interactive mode without example and generates .velocitas.json and AppManifest without defaults', (ctx) => {
            expect(ctx.stdout).to.contain('Creating a new Velocitas project ...');
            expect(ctx.stdout).to.contain('Interactive project creation started');
            expect(ctx.stdout).to.contain(`... Project for Vehicle Application '${TEST_APP_NAME}' created!`);
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(`... Downloading package: '${TEST_PACKAGE_NAME}:${TEST_PACKAGE_VERSION}'`);
            expect(ctx.stdout).to.contain('Syncing Velocitas components!');

            expect(fs.existsSync(`${process.cwd()}/.velocitas.json`)).to.be.true;
            expect(fs.existsSync(`${process.cwd()}/app/AppManifest.json`)).to.be.true;

            const velocitasConfig = ProjectConfig.read();
            expect(velocitasConfig.packages[0].repo).to.be.equal(TEST_PACKAGE_URI);
            expect(velocitasConfig.packages[0].version).to.be.equal(TEST_PACKAGE_VERSION);
            expect(velocitasConfig.variables.get('language')).to.be.equal('test');

            const appManifest = readAppManifest();
            expect(appManifest.name).to.be.equal(TEST_APP_NAME);
            expect(appManifest.interfaces[0].type).to.be.equal(TEST_EXPOSED_INTERFACE_TYPE);
            expect(appManifest.interfaces[0].config[TEST_EXPOSED_INTERFACE_ARG_NAME_1]).to.be.equal('testNotDefault');
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
        .stub(exec, 'awaitSpawn', () => {})
        .stub(ux, 'prompt', () => TEST_APP_NAME)
        .stub(inquirer, 'prompt', () => {
            return {
                language: 'test',
                exampleQuestion: true,
                exampleUse: true,
            };
        })
        .command(['create'])
        .it('creates project in interactive mode with example and generates .velocitas.json and AppManifest', (ctx) => {
            expect(ctx.stdout).to.contain('Creating a new Velocitas project ...');
            expect(ctx.stdout).to.contain('Interactive project creation started');
            expect(ctx.stdout).to.contain(`... Project for Vehicle Application '${TEST_APP_NAME}' created!`);
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(`... Downloading package: '${TEST_PACKAGE_NAME}:${TEST_PACKAGE_VERSION}'`);
            expect(ctx.stdout).to.contain('Syncing Velocitas components!');

            expect(fs.existsSync(`${process.cwd()}/.velocitas.json`)).to.be.true;
            expect(fs.existsSync(`${process.cwd()}/app/AppManifest.json`)).to.be.true;

            const velocitasConfig = ProjectConfig.read();
            expect(velocitasConfig.packages[0].repo).to.be.equal(TEST_PACKAGE_URI);
            expect(velocitasConfig.packages[0].version).to.be.equal(TEST_PACKAGE_VERSION);
            expect(velocitasConfig.variables.get('language')).to.be.equal('test');

            const appManifest = readAppManifest();
            expect(appManifest.name).to.be.equal(TEST_APP_NAME);
        });
});
