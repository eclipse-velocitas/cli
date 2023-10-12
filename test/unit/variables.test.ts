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

import { expect } from 'chai';
import 'mocha';
import { ComponentType, SetupComponent } from '../../src/modules/component';
import { PackageConfig } from '../../src/modules/package';
import { ComponentConfig, ProjectConfig } from '../../src/modules/project-config';
import { VariableCollection } from '../../src/modules/variables';

let projectConfig: ProjectConfig;
let packageConfig: PackageConfig;
let componentConfig: ComponentConfig;
let componentManifest: SetupComponent;
let variablesObject: { [key: string]: any };
let variablesMap: Map<string, any>;

describe('variables - module', () => {
    beforeEach(() => {
        variablesObject = { testString: 'test', testNumber: 1 };
        variablesMap = new Map(Object.entries(variablesObject));
        packageConfig = new PackageConfig({ name: 'test-package', version: 'v1.1.1', variables: variablesMap, components: [] });
        projectConfig = new ProjectConfig({ packages: [packageConfig], variables: variablesMap, cliVersion: 'v0.0.0' });

        componentConfig = { id: 'test-component', variables: variablesMap };
        componentManifest = {
            id: 'test-component',
            files: [{ src: 'src/test', dst: '.test', condition: '' }],
            variables: [
                {
                    name: 'testString',
                    type: 'string',
                    description: 'Required string variable',
                },
                {
                    name: 'testNumber',
                    type: 'number',
                    description: 'Required number variable',
                },
                {
                    name: 'testWithDefault',
                    type: 'string',
                    description: 'Non-required variable with default value',
                    default: 'Foo',
                },
                {
                    name: 'testBooleanWithDefault',
                    type: 'boolean',
                    description: 'A bool with a default value',
                    default: false,
                },
            ],
            type: ComponentType.setup,
        };
    });
    describe('VariableCollection', () => {
        it('should build a VariableCollection with given mocks', () => {
            const variableCollection = VariableCollection.build(projectConfig, packageConfig, componentConfig, componentManifest);
            expect(variableCollection).to.exist;
            expect(variableCollection).to.be.an.instanceof(VariableCollection);
        });
        it('should skip verifyGivenVariables when component does not expect variables', () => {
            componentManifest.variables = [];
            const variableCollection = VariableCollection.build(projectConfig, packageConfig, componentConfig, componentManifest);
            expect(variableCollection).to.exist;
            expect(variableCollection).to.be.an.instanceof(VariableCollection);
        });
        it('should throw an error when component expects required variables which are not configured', () => {
            projectConfig.packages[0].variables = new Map();
            projectConfig.variables = new Map();
            packageConfig.variables = new Map();
            componentConfig.variables = new Map();
            let expectedErrorMessage: string = '';
            expectedErrorMessage += `'${componentConfig.id}' has issues with its configured variables:\n`;
            expectedErrorMessage += `Is missing required variables:\n`;
            if (componentManifest.variables) {
                expectedErrorMessage += `* '${componentManifest.variables[0].name}'\n`;
                expectedErrorMessage += `\tType: ${componentManifest.variables[0].type}\n`;
                expectedErrorMessage += `\t${componentManifest.variables[0].description}\n`;
                expectedErrorMessage += `* '${componentManifest.variables[1].name}'\n`;
                expectedErrorMessage += `\tType: ${componentManifest.variables[1].type}\n`;
                expectedErrorMessage += `\t${componentManifest.variables[1].description}`;
            }
            expect(() => VariableCollection.build(projectConfig, packageConfig, componentConfig, componentManifest)).to.throw(
                expectedErrorMessage,
            );
        });
        it('should throw an error when exposed component variable has wrong type', () => {
            projectConfig.packages[0].variables?.set('testNumber', 'wrongType');
            let expectedErrorMessage: string = '';
            expectedErrorMessage += `'${componentConfig.id}' has issues with its configured variables:\n`;
            expectedErrorMessage += `Has wrongly typed variables:\n`;
            if (componentManifest.variables) {
                expectedErrorMessage += `* '${componentManifest.variables[1].name}' has wrong type! Expected ${componentManifest.variables[1].type} but got string`;
            }
            expect(() => VariableCollection.build(projectConfig, packageConfig, componentConfig, componentManifest)).to.throw(
                expectedErrorMessage,
            );
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
        it('should provide builtin variables', () => {
            const vars = VariableCollection.build(projectConfig, packageConfig, componentConfig, componentManifest);

            expect(vars.substitute('${{ builtin.package.version }}')).to.equal('v1.1.1');
            expect(vars.substitute('${{ builtin.package.github.org }}')).to.equal('eclipse-velocitas');
            expect(vars.substitute('${{ builtin.package.github.repo }}')).to.equal('test-package');
            expect(vars.substitute('${{ builtin.package.github.ref }}')).to.equal('v1.1.1');
            expect(vars.substitute('${{ builtin.component.id }}')).to.equal('test-component');
            expect(vars.substitute('${{ builtin.component.type }}')).to.equal('setup');
        });
        it('should transform variable names into allowed environment variable names', () => {
            const vars = VariableCollection.build(projectConfig, packageConfig, componentConfig, componentManifest);

            const envVars = vars.asEnvVars();
            expect(envVars['builtin_package_version']).to.equal('v1.1.1');
            expect(envVars['builtin_package_github_org']).to.equal('eclipse-velocitas');
            expect(envVars['builtin_package_github_repo']).to.equal('test-package');
            expect(envVars['builtin_package_github_ref']).to.equal('v1.1.1');
            expect(envVars['builtin_component_id']).to.equal('test-component');
            expect(envVars['builtin_component_type']).to.equal('setup');
        });
    });
});
