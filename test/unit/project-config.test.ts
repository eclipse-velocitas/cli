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

import 'mocha';
import mockfs from 'mock-fs';
import { ProjectConfig } from '../../src/modules/project-config';
import { expect } from 'chai';
import { homedir } from 'node:os';

describe('project-config - module', () => {
    before(() => {
        const packageManifestPath = `${homedir()}/.velocitas/packages/pkg1/v1.0.0/manifest.json`;
        const mockfsConf: any = {
            '/.velocitasInvalid.json': 'foo',
            '/.velocitasValid.json':
                '{ "packages": [{"repo":"pkg1", "version": "v1.0.0"}], "components": [{"id": "comp1"}], "variables": {} }',
            '/.velocitasValidNoComps.json': '{ "packages": [{"repo":"pkg1", "version": "v1.0.0"}], "variables": {} }',
        };
        mockfsConf[packageManifestPath] = '{ "components": [{"id": "comp1"}, {"id": "comp2"}]}';
        mockfs(mockfsConf, { createCwd: false });
    });
    describe('.velocitas.json reading', () => {
        it('should return false when there is no .velocitas.json at the provided path.', () => {
            expect(ProjectConfig.isAvailable('/.noVelocitas.json')).to.be.false;
        });
        it('should return true when there is a .velocitas.json at the provided path.', () => {
            expect(ProjectConfig.isAvailable('/.velocitasValid.json')).to.be.true;
        });
    });
    describe('.velocitas.json parsing', () => {
        it('should throw an error when .velocitas.json is invalid.', () => {
            expect(ProjectConfig.read.bind(ProjectConfig.read, ...['v0.0.0', '/.velocitasInvalid.json'])).to.throw();
        });
        it('should read the ProjectConfig when .velocitas.json is valid.', () => {
            expect(ProjectConfig.read.bind(ProjectConfig.read, ...['v0.0.0', '/.velocitasValid.json'])).to.not.throw();
        });
    });
    describe('ProjectConfig components', () => {
        it('should only return referenced components', () => {
            const projectConfig = ProjectConfig.read('v0.0.0', '/.velocitasValid.json');
            expect(projectConfig.getComponents()).to.have.length(1);
            expect(projectConfig.getComponents()[0].manifest.id).to.be.eq('comp1');
        });
        it('should only return all components, if no components are referenced', () => {
            const projectConfig = ProjectConfig.read('v0.0.0', '/.velocitasValidNoComps.json');
            expect(projectConfig.getComponents()).to.have.length(2);
            expect(projectConfig.getComponents()[0].manifest.id).to.be.eq('comp1');
            expect(projectConfig.getComponents()[1].manifest.id).to.be.eq('comp2');
        });
    });
    after(() => {
        mockfs.restore();
    });
});
