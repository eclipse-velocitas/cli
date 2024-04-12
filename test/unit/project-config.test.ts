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

import { expect } from 'chai';
import 'mocha';
import { homedir } from 'node:os';
import { cwd } from 'node:process';
import sinon from 'sinon';
import { ProjectConfig, ProjectConfigLock } from '../../src/modules/project-config';
import { CliFileSystem, MockFileSystem, MockFileSystemObj } from '../../src/utils/fs-bridge';

describe('project-config - module', () => {
    const packageManifestPath = `${homedir()}/.velocitas/packages/pkg1/v1.0.0/manifest.json`;
    const validProjectConfigPath = `${cwd()}/.velocitasValid.json`;
    const validProjectConfigLockPath = `${cwd()}/.velocitasValid-lock.json`;
    const validProjectConfigNoCompsPath = `${cwd()}/.velocitasValidNoComps.json`;
    const invalidProjectConfigPath = `${cwd()}/.velocitasInvalid.json`;
    before(() => {
        const mockFilesystem: MockFileSystemObj = {
            [validProjectConfigPath]: '{ "packages": {"pkg1": "v1.0.0"}, "components": ["comp1"], "variables": {} }',
            [validProjectConfigLockPath]: '{ "packages": {"pkg1": "v1.0.0"} }',
            [validProjectConfigNoCompsPath]: '{ "packages": {"pkg1": "v1.0.0"}, "components": [], "variables": {} }',
            [invalidProjectConfigPath]: 'foo',
            [packageManifestPath]: '{ "components": [{"id": "comp1"}, {"id": "comp2"}]}',
        };
        CliFileSystem.setImpl(new MockFileSystem(mockFilesystem));
    });
    describe('.velocitas.json reading', () => {
        it('should return false when there is no .velocitas.json at the provided path.', () => {
            expect(ProjectConfig.isAvailable('/.noVelocitas.json')).to.be.false;
        });
        it('should return true when there is a .velocitas.json at the provided path.', () => {
            expect(ProjectConfig.isAvailable('/.velocitasValid.json')).to.be.true;
        });
    });
    describe('.velocitas-lock.json reading', () => {
        it('should return false when there is no .velocitas-lock.json at the provided path.', () => {
            expect(ProjectConfigLock.isAvailable('/.noVelocitas.json')).to.be.false;
        });
        it('should return true when there is a .velocitas-lock.json at the provided path.', () => {
            expect(ProjectConfigLock.isAvailable('/.velocitasValid-lock.json')).to.be.true;
        });
    });
    describe('.velocitas.json parsing', () => {
        it('should throw an error when .velocitas.json is invalid.', () => {
            expect(ProjectConfig.read.bind(ProjectConfig.read, ...['v0.0.0', './.velocitasInvalid.json'])).to.throw();
        });
        it('should read the ProjectConfig when .velocitas.json is valid.', () => {
            expect(ProjectConfig.read.bind(ProjectConfig.read, ...['v0.0.0', './.velocitasValid.json'])).to.not.throw();
        });
    });
    describe('.velocitas-lock.json parsing', () => {
        it('should throw an error when .velocitas-lock.json is invalid.', () => {
            expect(() => ProjectConfigLock.read('./.velocitasInvalid.json')).to.throw();
        });
        it('should be null when no .velocitas-lock.json is found.', () => {
            expect(ProjectConfigLock.read()).to.be.null;
        });
        it('should read the ProjectLockConfig when .velocitas-lock.json is valid.', () => {
            expect(ProjectConfigLock.read('./.velocitasValid-lock.json')).to.not.be.null;
        });
    });
    describe('.velocitas-lock.json writing', () => {
        it('should throw an error when writing to .velocitas-lock.json fails.', () => {
            const projectConfig = ProjectConfig.read('v0.0.0', './.velocitasValid.json');
            const writeFileStub = sinon.stub(CliFileSystem, 'writeFileSync').throws('Mocked error');
            const writeFunction = () => ProjectConfigLock.write(projectConfig);
            expect(writeFunction).to.throw('Error writing .velocitas-lock.json: Mocked error');
            writeFileStub.restore();
        });
    });
    describe('ProjectConfig components', () => {
        it('should only return referenced components', () => {
            const projectConfig = ProjectConfig.read('v0.0.0', './.velocitasValid.json');
            expect(projectConfig.getComponents()).to.have.length(1);
            expect(projectConfig.getComponents()[0].manifest.id).to.be.eq('comp1');
        });
        it('should only return all components, if no components are referenced', () => {
            const projectConfig = ProjectConfig.read('v0.0.0', './.velocitasValidNoComps.json');
            expect(projectConfig.getComponents()).to.have.length(2);
            expect(projectConfig.getComponents()[0].manifest.id).to.be.eq('comp1');
            expect(projectConfig.getComponents()[1].manifest.id).to.be.eq('comp2');
        });
    });
});
