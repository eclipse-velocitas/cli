// Copyright (c) 2022 Robert Bosch GmbH
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

import { ComponentConfig, PackageConfig, ProjectConfig } from '../../src/modules/project-config';
import { ComponentType, SetupComponent } from '../../src/modules/component';

import { VariableCollection } from '../../src/modules/variables';
import { expect } from 'chai';

let projectConfig: ProjectConfig;
let packageConfig: PackageConfig;
let componentConfig: ComponentConfig;
let component: SetupComponent;
let variablesObject: { [key: string]: any };
let variablesMap: Map<string, any>;

describe('variables - module', () => {
    beforeEach(() => {
        variablesObject = { testString: 'test', testNumber: 1 };
        variablesMap = new Map(Object.entries(variablesObject));
        projectConfig = {
            packages: [{ name: 'test-component', version: 'v1.1.1', variables: variablesMap, components: [] }],
            variables: variablesMap,
            write: () => {},
        };

        packageConfig = { name: 'test-component', version: 'v1.1.1', variables: variablesMap, components: [] };
        componentConfig = { id: 'test-component', variables: variablesMap };
        component = {
            id: 'test-component',
            files: [{ src: 'src/test', dst: '.test', condition: '' }],
            variables: [
                {
                    name: 'testString',
                    type: 'string',
                    required: true,
                    description: 'Required string variable',
                },
                {
                    name: 'testNumber',
                    type: 'number',
                    required: true,
                    description: 'Required number variable',
                },
            ],
            type: ComponentType.setup,
        };
    });
    describe('VariableCollection', () => {
        it('should build a VariableCollection with given mocks', () => {
            const variableCollection = VariableCollection.build(projectConfig, packageConfig, componentConfig, component);
            expect(variableCollection).to.exist;
            expect(variableCollection).to.be.an.instanceof(VariableCollection);
        });
        it('should skip verifyGivenVariables when component does not expect variables', () => {
            component.variables = [];
            const variableCollection = VariableCollection.build(projectConfig, packageConfig, componentConfig, component);
            expect(variableCollection).to.exist;
            expect(variableCollection).to.be.an.instanceof(VariableCollection);
        });
        it('should throw an error when component expects required variables which are not configured', () => {
            projectConfig.packages[0].variables = new Map();
            projectConfig.variables = new Map();
            packageConfig.variables = new Map();
            componentConfig.variables = new Map();
            let expectedErrorMessage: string = '';
            expectedErrorMessage += `'${projectConfig.packages[0].name}' has issues with its configured variables:\n`;
            expectedErrorMessage += `Is missing required variables:\n`;
            expectedErrorMessage += `* '${component.variables[0].name}'\n`;
            expectedErrorMessage += `\tType: ${component.variables[0].type}\n`;
            expectedErrorMessage += `\t${component.variables[0].description}\n`;
            expectedErrorMessage += `* '${component.variables[1].name}'\n`;
            expectedErrorMessage += `\tType: ${component.variables[1].type}\n`;
            expectedErrorMessage += `\t${component.variables[1].description}`;
            expect(() => VariableCollection.build(projectConfig, packageConfig, componentConfig, component)).to.throw(expectedErrorMessage);
        });
        it('should throw an error when exposed component variable has wrong type', () => {
            projectConfig.packages[0].variables.set('testNumber', 'wrongType');
            let expectedErrorMessage: string = '';
            expectedErrorMessage += `'${projectConfig.packages[0].name}' has issues with its configured variables:\n`;
            expectedErrorMessage += `Has wrongly typed variables:\n`;
            expectedErrorMessage += `* '${component.variables[1].name}' has wrong type! Expected ${component.variables[1].type} but got string`;
            expect(() => VariableCollection.build(projectConfig, packageConfig, componentConfig, component)).to.throw(expectedErrorMessage);
        });
        it('should throw an error when unused variables are configured', () => {
            // Can be uncommented when
            // treatUnusedAsError flag in variables module is set to true
            // class VerifyFlags {
            //     treatUnusedAsError: Boolean = false;
            //     treatMissingAsError: Boolean = true;
            // }
            //
            //
            //     projectConfig.packages[0].variables.set('testUnused', 'unused');
            //     let expectedErrorMessage: string = '';
            //     expectedErrorMessage += `'${projectConfig.packages[0].name}' has issues with its configured variables:\n`;
            //     expectedErrorMessage += `Is provided unsupported variables:\n`;
            //     expectedErrorMessage += `* 'testUnused'`;
            //     expect(() => VariableCollection.build(projectConfig, packageConfig, componentConfig, component)).to.throw(expectedErrorMessage);
        });
    });
});
