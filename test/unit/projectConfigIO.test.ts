// Copyright (c) 2024-2025 Contributors to the Eclipse Foundation
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
import 'mocha';
import { cwd } from 'node:process';
import sinon from 'sinon';
import { ComponentConfig } from '../../src/modules/component';
import { PackageConfig } from '../../src/modules/package';
import { ProjectConfigIO } from '../../src/modules/projectConfig/projectConfigIO';
import { CliFileSystem, MockFileSystem, MockFileSystemObj } from '../../src/utils/fs-bridge';

const configFileMock = {
    packages: {
        'test-package': 'v0.0.1',
    },
    components: ['test-component'],
    variables: {
        projectVariable: 'projectTest',
        ['packageVariable@test-package']: 'packageTest',
        ['componentVariable@test-component']: 'componentTest',
    },
    cliVersion: 'v0.0.1',
};

const configFileMockNoVariables = {
    packages: {
        'test-package': 'v0.0.1',
    },
    components: ['test-component'],
    cliVersion: 'v0.0.1',
};

const configFileMockNoVariablesAndComponents = {
    packages: {
        'test-package': 'v0.0.1',
    },
    cliVersion: 'v0.0.1',
};

const configFileLockMock = {
    packages: {
        'test-package': 'v0.0.2',
    },
};

const configFileLegacyMock = {
    packages: [
        {
            repo: 'test-package',
            version: 'v0.0.1',
            variables: { packageVariable: 'packageTest' },
        },
    ],
    components: [{ id: 'test-component', variables: { componentVariable: 'componentTest' } }],
    variables: {
        projectVariable: 'projectTest',
    },
    cliVersion: 'v0.0.1',
};

const configFileLegacyMockNoVariables = {
    packages: [
        {
            repo: 'test-package',
            version: 'v0.0.1',
        },
    ],
    components: [{ id: 'test-component' }],
    cliVersion: 'v0.0.1',
};

const configFilePath = `${cwd()}/.velocitas.json`;
const configFileLockPath = `${cwd()}/.velocitas-lock.json`;
const configFilePathNoVariables = `${cwd()}/.velocitasNoVariables.json`;
const configFilePathNoVariablesAndComponents = `${cwd()}/.velocitasNoVariablesAndComponents.json`;
const configFileLegacyPath = `${cwd()}/.velocitas-legacy.json`;
const configFileLegacyPathNoVariables = `${cwd()}/.velocitas-legacyNoVariables.json`;

describe('projectConfigIO - module', () => {
    before(() => {
        const mockFilesystem: MockFileSystemObj = {
            [configFilePath]: JSON.stringify(configFileMock),
            [configFileLockPath]: JSON.stringify(configFileLockMock),
            [configFilePathNoVariables]: JSON.stringify(configFileMockNoVariables),
            [configFilePathNoVariablesAndComponents]: JSON.stringify(configFileMockNoVariablesAndComponents),
            [configFileLegacyPath]: JSON.stringify(configFileLegacyMock),
            [configFileLegacyPathNoVariables]: JSON.stringify(configFileLegacyMockNoVariables),
        };
        CliFileSystem.setImpl(new MockFileSystem(mockFilesystem));
    });

    describe('File Reading', () => {
        it('should parse component configurations from the provided .velocitas.json file', () => {
            const configFileObj = ProjectConfigIO.read('', configFilePath, true);
            const projectConfigComponents = configFileObj.getComponents();
            expect(projectConfigComponents.every((cmp) => cmp instanceof ComponentConfig)).to.be.true;
            expect(projectConfigComponents.length).to.equal(1);
            expect(projectConfigComponents[0].id).to.equal('test-component');
        });

        it('should assign variables to package configurations', () => {
            const configFileObj = ProjectConfigIO.read('', configFilePath, true);
            const projectConfigPackages = configFileObj.getPackages();
            const packageVariable = projectConfigPackages[0].variables.get('packageVariable');
            expect(packageVariable).to.equal('packageTest');
        });

        it('should assign variables to component configurations', () => {
            const configFileObj = ProjectConfigIO.read('', configFilePath, true);
            const projectConfigComponents = configFileObj.getComponents();
            const componentVariable = projectConfigComponents[0].variables.get('componentVariable');
            expect(componentVariable).to.equal('componentTest');
        });

        it('should assign empty maps to every variables property if no variables are provided', () => {
            const configFileObj = ProjectConfigIO.read('', configFilePathNoVariables, true);
            const projectConfigPackages = configFileObj.getPackages();
            const projectConfigComponents = configFileObj.getComponents();
            const projectConfigVariables = configFileObj.getVariableMappings();
            expect(projectConfigVariables).to.be.an.instanceOf(Map);
            expect(projectConfigVariables.size).to.equal(0);
            expect(projectConfigPackages[0].variables).to.be.an.instanceOf(Map);
            expect(projectConfigPackages[0].variables.size).to.equal(0);
            expect(projectConfigComponents[0].variables).to.be.an.instanceOf(Map);
            expect(projectConfigComponents[0].variables.size).to.equal(0);
        });

        it('should assign an empty array to components configuration if no components are provided', () => {
            const configFileObj = ProjectConfigIO.read('', configFilePathNoVariablesAndComponents, true);
            const projectConfigComponents = configFileObj.getComponents();
            expect(projectConfigComponents).to.be.an('array');
            expect(projectConfigComponents.length).to.equal(0);
        });

        it('should handle project configuration lock if available', () => {
            const configFileObj = ProjectConfigIO.read('', configFilePath, false);
            const projectConfigPackages = configFileObj.getPackages();
            expect(projectConfigPackages.every((pkg) => pkg instanceof PackageConfig)).to.be.true;
            expect(projectConfigPackages.length).to.equal(1);
            expect(projectConfigPackages[0].repo).to.equal('test-package');
            expect(projectConfigPackages[0].version).to.equal('v0.0.2');
        });

        it('should correctly store the CLI version from .velocitas.json file', () => {
            const configFileObj = ProjectConfigIO.read('', configFilePath, true);
            expect(configFileObj.cliVersion).to.equal('v0.0.1');
        });
    });

    describe('Legacy File Reading', () => {
        it('should parse component configurations from the provided .velocitas.json file', () => {
            const configFileObj = ProjectConfigIO.read('', configFileLegacyPath, true);
            const projectConfigComponents = configFileObj.getComponents();
            expect(projectConfigComponents.every((cmp) => cmp instanceof ComponentConfig)).to.be.true;
            expect(projectConfigComponents.length).to.equal(1);
            expect(projectConfigComponents[0].id).to.equal('test-component');
        });

        it('should assign variables to package configurations', () => {
            const configFileObj = ProjectConfigIO.read('', configFileLegacyPath, true);
            const projectConfigPackages = configFileObj.getPackages();
            const packageVariable = projectConfigPackages[0].variables.get('packageVariable');
            expect(packageVariable).to.equal('packageTest');
        });

        it('should assign variables to component configurations', () => {
            const configFileObj = ProjectConfigIO.read('', configFileLegacyPath, true);
            const projectConfigComponents = configFileObj.getComponents();
            const componentVariable = projectConfigComponents[0].variables.get('componentVariable');
            expect(componentVariable).to.equal('componentTest');
        });

        it('should assign empty maps to every variables property if no variables are provided', () => {
            const configFileObj = ProjectConfigIO.read('', configFileLegacyPathNoVariables, true);
            const projectConfigPackages = configFileObj.getPackages();
            const projectConfigComponents = configFileObj.getComponents();
            const projectConfigVariables = configFileObj.getVariableMappings();
            expect(projectConfigVariables).to.be.an.instanceOf(Map);
            expect(projectConfigVariables.size).to.equal(0);
            expect(projectConfigPackages[0].variables).to.be.an.instanceOf(Map);
            expect(projectConfigPackages[0].variables.size).to.equal(0);
            expect(projectConfigComponents[0].variables).to.be.an.instanceOf(Map);
            expect(projectConfigComponents[0].variables.size).to.equal(0);
        });

        it('should assign an empty array to components configuration if no components are provided', () => {
            const configFileObj = ProjectConfigIO.read('', configFilePathNoVariablesAndComponents, true);
            const projectConfigComponents = configFileObj.getComponents();
            expect(projectConfigComponents).to.be.an('array');
            expect(projectConfigComponents.length).to.equal(0);
        });

        it('should handle project configuration lock if available', () => {
            const configFileObj = ProjectConfigIO.read('', configFileLegacyPath, false);
            const projectConfigPackages = configFileObj.getPackages();
            expect(projectConfigPackages.every((pkg) => pkg instanceof PackageConfig)).to.be.true;
            expect(projectConfigPackages.length).to.equal(1);
            expect(projectConfigPackages[0].repo).to.equal('test-package');
            expect(projectConfigPackages[0].version).to.equal('v0.0.2');
        });

        it('should correctly store the CLI version from .velocitas.json file', () => {
            const configFileObj = ProjectConfigIO.read('', configFileLegacyPath, true);
            expect(configFileObj.cliVersion).to.equal('v0.0.1');
        });
    });

    describe('Error handling', () => {
        it('should handle errors when parsing .velocitas.json file', () => {
            const readFileStub = sinon.stub(CliFileSystem, 'readFileSync').throws();
            const projectConfigFileReader = () => ProjectConfigIO.read('', configFilePath, true);
            expect(projectConfigFileReader).to.throw(`Unable to read ${configFilePath}: unknown format!`);
            readFileStub.restore();
        });

        it('should handle errors when lock file is not found', () => {
            const readLockFileStub = sinon.stub(ProjectConfigIO, 'readLock').returns(null);
            const projectConfigLockFileReader = () => ProjectConfigIO.readLock(configFileLockPath);
            expect(projectConfigLockFileReader).not.to.throw();
            readLockFileStub.restore();
        });

        it('should handle errors when reading lock file', () => {
            const readLockFileStub = sinon.stub(ProjectConfigIO, 'readLock').throws(new Error('Lock file error'));
            const projectConfigLockFileReader = () => ProjectConfigIO.readLock(configFileLockPath);
            expect(projectConfigLockFileReader).to.throw('Lock file error');
            readLockFileStub.restore();
        });
    });
});
