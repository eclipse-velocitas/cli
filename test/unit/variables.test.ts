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

import { expect } from 'chai';
import 'mocha';
import { PackageConfig } from '../../src/modules/package';
import { ProjectConfig } from '../../src/modules/project-config';
import { ScopeIdentifier, VariableCollection } from '../../src/modules/variables';
import { ComponentConfig, ComponentContext, ComponentManifest } from '../../src/modules/component';

let projectConfig: ProjectConfig;
let pkg1Config: PackageConfig;
let pkg2Config: PackageConfig;
let pkg1Comp1Cfg: ComponentConfig;
let pkg1Comp1Manifest: ComponentManifest;
let pkg2Comp1Manifest: ComponentManifest;
let pkg2Comp2Cfg: ComponentConfig;
let pkg2Comp2Manifest: ComponentManifest;
let variablesObject: { [key: string]: any };
let variablesMap: Map<string, any>;
let componentContext: ComponentContext;
let componentContext2: ComponentContext;
let componentContext3: ComponentContext;

describe('variables - module', () => {
    beforeEach(() => {
        variablesObject = { testString: 'test', testNumber: 1 };
        variablesMap = new Map(Object.entries(variablesObject));
        pkg1Config = new PackageConfig({ repo: 'test-package', version: 'v1.1.1', variables: variablesMap });
        pkg2Config = new PackageConfig({ repo: 'test-package2', version: 'v0.0.1' });
        projectConfig = new ProjectConfig('v0.0.0', { packages: [pkg1Config], variables: variablesMap });

        pkg1Comp1Cfg = { id: 'test-component', variables: variablesMap };
        pkg1Comp1Manifest = {
            id: 'test-component',
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
        };
        pkg2Comp1Manifest = {
            id: 'test-component2',
            variables: [
                {
                    name: 'exportedStringConst',
                    type: 'string',
                    scope: ScopeIdentifier.project,
                    default: 'PROJECT_EXPORTED',
                    constant: true,
                    description: 'Exported string const',
                },
                {
                    name: 'exportedString',
                    type: 'string',
                    scope: ScopeIdentifier.package,
                    default: 'PACKAGE_EXPORTED',
                    description: 'Exported string const',
                },
            ],
        };
        pkg2Comp2Manifest = {
            id: 'test-component3',
            variables: [],
        };

        componentContext = new ComponentContext(pkg1Config, pkg1Comp1Manifest, pkg1Comp1Cfg);
        componentContext2 = new ComponentContext(pkg2Config, pkg2Comp1Manifest, new ComponentConfig(pkg2Comp1Manifest.id));
        componentContext3 = new ComponentContext(pkg2Config, pkg2Comp2Manifest, new ComponentConfig(pkg2Comp2Manifest.id));
    });
    describe('VariableCollection', () => {
        it('should build a VariableCollection with given mocks', () => {
            const variableCollection = VariableCollection.build([componentContext], variablesMap, componentContext);
            expect(variableCollection).to.exist;
            expect(variableCollection).to.be.an.instanceof(VariableCollection);
        });
        it('should skip verifyGivenVariables when component does not expect variables', () => {
            pkg1Comp1Manifest.variables = [];
            const variableCollection = VariableCollection.build([componentContext], variablesMap, componentContext);
            expect(variableCollection).to.exist;
            expect(variableCollection).to.be.an.instanceof(VariableCollection);
        });
        it('should throw an error when component expects required variables which are not configured', () => {
            pkg1Config.variables = new Map();
            pkg1Comp1Cfg.variables = new Map();
            let expectedErrorMessage: string = '';
            expectedErrorMessage += `'${pkg1Comp1Cfg.id}' has issues with its configured variables:\n`;
            expectedErrorMessage += `Is missing required variables:\n`;
            if (pkg1Comp1Manifest.variables) {
                expectedErrorMessage += `* '${pkg1Comp1Manifest.variables[0].name}'\n`;
                expectedErrorMessage += `\tType: ${pkg1Comp1Manifest.variables[0].type}\n`;
                expectedErrorMessage += `\t${pkg1Comp1Manifest.variables[0].description}\n`;
                expectedErrorMessage += `* '${pkg1Comp1Manifest.variables[1].name}'\n`;
                expectedErrorMessage += `\tType: ${pkg1Comp1Manifest.variables[1].type}\n`;
                expectedErrorMessage += `\t${pkg1Comp1Manifest.variables[1].description}`;
            }
            expect(() => VariableCollection.build([componentContext], new Map(), componentContext)).to.throw(expectedErrorMessage);
        });
        it('should throw an error when exposed component variable has wrong type', () => {
            projectConfig.getPackages()[0].variables?.set('testNumber', 'wrongType');
            let expectedErrorMessage: string = '';
            expectedErrorMessage += `'${pkg1Comp1Cfg.id}' has issues with its configured variables:\n`;
            expectedErrorMessage += `Has wrongly typed variables:\n`;
            if (pkg1Comp1Manifest.variables) {
                expectedErrorMessage += `* '${pkg1Comp1Manifest.variables[1].name}' has wrong type! Expected ${pkg1Comp1Manifest.variables[1].type} but got string`;
            }
            expect(() => VariableCollection.build([componentContext], variablesMap, componentContext)).to.throw(expectedErrorMessage);
        });
        it('should allow project scope variables to be passed to other components', () => {
            const variableCollection = VariableCollection.build([componentContext, componentContext2], variablesMap, componentContext);
            expect(variableCollection).to.exist;
            expect(variableCollection).to.be.an.instanceof(VariableCollection);
            expect(variableCollection.substitute('${{ exportedStringConst }}')).to.equal('PROJECT_EXPORTED');
        });
        it('should allow package scope variables to be passed to other components within the same package', () => {
            const variableCollection1 = VariableCollection.build(
                [componentContext, componentContext2, componentContext3],
                variablesMap,
                componentContext3,
            );
            const variableCollection2 = VariableCollection.build(
                [componentContext, componentContext2, componentContext3],
                variablesMap,
                componentContext,
            );
            expect(variableCollection1).to.exist;
            expect(variableCollection1).to.be.an.instanceof(VariableCollection);
            expect(variableCollection1.substitute('${{ exportedString }}')).to.equal('PACKAGE_EXPORTED');
            expect(variableCollection2).to.exist;
            expect(variableCollection2).to.be.an.instanceof(VariableCollection);
            expect(variableCollection2.substitute('${{ exportedString }}')).to.equal('${{ exportedString }}');
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
            const vars = VariableCollection.build([componentContext], variablesMap, componentContext);

            expect(vars.substitute('${{ builtin.package.version }}')).to.equal('v1.1.1');
            expect(vars.substitute('${{ builtin.package.github.org }}')).to.equal('eclipse-velocitas');
            expect(vars.substitute('${{ builtin.package.github.repo }}')).to.equal('test-package');
            expect(vars.substitute('${{ builtin.package.github.ref }}')).to.equal('v1.1.1');
            expect(vars.substitute('${{ builtin.component.id }}')).to.equal('test-component');
        });
        it('should transform variable names into allowed environment variable names', () => {
            const vars = VariableCollection.build([componentContext], variablesMap, componentContext);

            const envVars = vars.asEnvVars();
            expect(envVars['builtin_package_version']).to.equal('v1.1.1');
            expect(envVars['builtin_package_github_org']).to.equal('eclipse-velocitas');
            expect(envVars['builtin_package_github_repo']).to.equal('test-package');
            expect(envVars['builtin_package_github_ref']).to.equal('v1.1.1');
            expect(envVars['builtin_component_id']).to.equal('test-component');
        });
    });
});
