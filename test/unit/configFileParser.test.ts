// Copyright (c) 2024 Contributors to the Eclipse Foundation
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
import { before } from 'mocha';
import { cwd } from 'node:process';
import sinon from 'sinon';
import { ComponentConfig } from '../../src/modules/component';
import { PackageConfig } from '../../src/modules/package';
import { CliFileSystem, MockFileSystem, MockFileSystemObj } from '../../src/utils/fs-bridge';
import { ProjectConfigFileParser } from '../../src/utils/projectConfigFileParser';

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

const configFilePath = `${cwd()}/.velocitas.json`;
const configFileLockPath = `${cwd()}/.velocitas-lock.json`;
const configFilePathNoVariables = `${cwd()}/.velocitasNoVariables.json`;
const configFilePathNoVariablesAndComponents = `${cwd()}/.velocitasNoVariablesAndComponents.json`;

describe('ProjectConfigFileParser', () => {
    before(() => {
        const mockFilesystem: MockFileSystemObj = {
            [configFilePath]: JSON.stringify(configFileMock),
            [configFileLockPath]: JSON.stringify(configFileLockMock),
            [configFilePathNoVariables]: JSON.stringify(configFileMockNoVariables),
            [configFilePathNoVariablesAndComponents]: JSON.stringify(configFileMockNoVariablesAndComponents),
        };
        CliFileSystem.setImpl(new MockFileSystem(mockFilesystem));
    });
    describe('File Parsing', () => {
        it('should parse package configurations from the provided .velocitas.json file', () => {
            const configFileObj = new ProjectConfigFileParser(configFilePath, true);
            expect(configFileObj.packages.every((pkg) => pkg instanceof PackageConfig)).to.be.true;
            expect(configFileObj.packages.length).to.equal(1);
            expect(configFileObj.packages[0].repo).to.equal('test-package');
            expect(configFileObj.packages[0].version).to.equal('v0.0.1');
        });

        it('should parse component configurations from the provided .velocitas.json file', () => {
            const configFileObj = new ProjectConfigFileParser(configFilePath, true);
            expect(configFileObj.components.every((cmp) => cmp instanceof ComponentConfig)).to.be.true;
            expect(configFileObj.components.length).to.equal(1);
            expect(configFileObj.components[0].id).to.equal('test-component');
        });

        it('should assign variables to package configurations', () => {
            const configFileObj = new ProjectConfigFileParser(configFilePath, true);
            const packageVariable = configFileObj.packages[0].variables.get('packageVariable');
            expect(packageVariable).to.equal('packageTest');
        });

        it('should assign variables to component configurations', () => {
            const configFileObj = new ProjectConfigFileParser(configFilePath, true);
            const componentVariable = configFileObj.components[0].variables.get('componentVariable');
            expect(componentVariable).to.equal('componentTest');
        });

        it('should assign empty maps to every variables property if no variables are provided', () => {
            const configFileObj = new ProjectConfigFileParser(configFilePathNoVariables, true);
            expect(configFileObj.variables).to.be.an.instanceOf(Map);
            expect(configFileObj.variables.size).to.equal(0);
            expect(configFileObj.packages[0].variables).to.be.an.instanceOf(Map);
            expect(configFileObj.packages[0].variables.size).to.equal(0);
            expect(configFileObj.components[0].variables).to.be.an.instanceOf(Map);
            expect(configFileObj.components[0].variables.size).to.equal(0);
        });

        it('should assign an empty array to components configuration if no components are provided', () => {
            const configFileObj = new ProjectConfigFileParser(configFilePathNoVariablesAndComponents, true);
            expect(configFileObj.components).to.be.an('array');
            expect(configFileObj.components.length).to.equal(0);
        });

        it('should handle project configuration lock if available', () => {
            const configFileObj = new ProjectConfigFileParser(configFilePath, false);
            expect(configFileObj.packages.every((pkg) => pkg instanceof PackageConfig)).to.be.true;
            expect(configFileObj.packages.length).to.equal(1);
            expect(configFileObj.packages[0].repo).to.equal('test-package');
            expect(configFileObj.packages[0].version).to.equal('v0.0.2');
        });

        it('should correctly store the CLI version from .velocitas.json file', () => {
            const configFileObj = new ProjectConfigFileParser(configFilePath, true);
            expect(configFileObj.cliVersion).to.equal('v0.0.1');
        });
    });

    describe('Error handling', () => {
        it('should handle errors when parsing .velocitas.json file', () => {
            const readFileStub = sinon.stub(CliFileSystem, 'readFileSync').throws('Mocked error');
            const projectConfigFileParser = () => new ProjectConfigFileParser(configFilePath, true);
            expect(projectConfigFileParser).to.throw(`Error in parsing ${configFilePath}: Mocked error`);
            readFileStub.restore();
        });
    });

    describe('toWritablePackageConfig', () => {
        it('should convert an array of PackageConfig objects into a writable Map', () => {
            const packageConfigs = [
                new PackageConfig({ repo: 'repo1', version: 'v1.0.0' }),
                new PackageConfig({ repo: 'repo2', version: 'v2.0.0' }),
            ];
            const writableMap = ProjectConfigFileParser.toWritablePackageConfig(packageConfigs);
            expect(writableMap).to.be.an.instanceOf(Map);
            expect(writableMap.size).to.equal(2);
            expect(writableMap.get('repo1')).to.equal('v1.0.0');
            expect(writableMap.get('repo2')).to.equal('v2.0.0');
        });

        it('should handle empty array input', () => {
            const writableMap = ProjectConfigFileParser.toWritablePackageConfig([]);
            expect(writableMap).to.be.an.instanceOf(Map);
            expect(writableMap.size).to.equal(0);
        });
    });

    describe('toWritableComponentConfig', () => {
        it('should convert an array of ComponentConfig objects into a writable string array', () => {
            const componentConfigs = [
                new ComponentConfig('component1'),
                new ComponentConfig('component2'),
                new ComponentConfig('component1'),
            ];
            const writableArray = ProjectConfigFileParser.toWritableComponentConfig(componentConfigs);
            expect(writableArray).to.be.an('array');
            expect(writableArray.length).to.equal(2);
            expect(writableArray).to.include.members(['component1', 'component2']);
        });

        it('should handle empty array input', () => {
            const writableArray = ProjectConfigFileParser.toWritableComponentConfig([]);
            expect(writableArray).to.be.an('array');
            expect(writableArray.length).to.equal(0);
        });
    });
});
