// Copyright (c) 2022-2025 Contributors to the Eclipse Foundation
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
import { ComponentConfig, ComponentContext, ComponentManifest } from '../../src/modules/component';
import { PackageConfig } from '../../src/modules/package';
import { ProjectConfig } from '../../src/modules/projectConfig/projectConfig';
import { ScopeIdentifier, VariableCollection } from '../../src/modules/variables';

let projectConfig: ProjectConfig;
let pkg1Comp1Cfg: ComponentConfig;
let pkg1Comp1Manifest: ComponentManifest;
let pkg2Comp1Manifest: ComponentManifest;
let pkg2Comp2Manifest: ComponentManifest;

let componentContext: ComponentContext;
let componentContext2: ComponentContext;
let componentContext3: ComponentContext;
let variablesMapProjCfg: Map<string, any>;

// content of velocitas.json
const variablesObjectProjCfg: { [key: string]: any } = {
    [`testString@test-package`]: 'test',
    [`testNumber@test-package`]: 1,
    [`testString@test-component`]: 'test',
    [`testNumber@test-component`]: 1,
};

const variablesObject: { [key: string]: any } = {
    testString: 'test',
    testNumber: 1,
};

describe('variables - module', () => {
    beforeEach(() => {
        variablesMapProjCfg = new Map(Object.entries(variablesObjectProjCfg));
        const variablesMapPkgCfg: Map<string, any> = new Map(Object.entries(variablesObject));
        const variablesMapCmpCfg: Map<string, any> = new Map(Object.entries(variablesObject));

        const pkg1Config: PackageConfig = new PackageConfig({ repo: 'test-package', version: 'v1.1.1', variables: variablesMapPkgCfg });
        const pkg2Config: PackageConfig = new PackageConfig({ repo: 'test-package2', version: 'v0.0.1' });
        pkg1Comp1Cfg = new ComponentConfig('test-component');
        pkg1Comp1Cfg.variables = variablesMapCmpCfg;

        projectConfig = new ProjectConfig('v0.0.0', {
            packages: [pkg1Config, pkg2Config],
            components: [pkg1Comp1Cfg],
            variables: variablesMapProjCfg,
            cliVersion: '',
        });

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
                {
                    name: 'testLevelTwoNesting',
                    type: 'string',
                    description: 'A variable with a variable reference',
                    default: 'I am unable to hold another level of reference ${{ testWithDefault }}',
                },
                {
                    name: 'testVariableReference',
                    type: 'string',
                    description: 'A variable with a variable reference',
                    default: 'I reference the value of ${{ testNumber }} and ${{ testLevelTwoNesting }}',
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

        componentContext = new ComponentContext(
            projectConfig.getPackages()[0],
            pkg1Comp1Manifest,
            projectConfig.getComponentConfig(pkg1Comp1Cfg.id),
            true,
        );
        componentContext2 = new ComponentContext(
            projectConfig.getPackages()[1],
            pkg2Comp1Manifest,
            new ComponentConfig(pkg2Comp1Manifest.id),
            true,
        );
        componentContext3 = new ComponentContext(
            projectConfig.getPackages()[1],
            pkg2Comp2Manifest,
            new ComponentConfig(pkg2Comp2Manifest.id),
            true,
        );
    });
    describe('VariableCollection', () => {
        it('should build a VariableCollection with given mocks', () => {
            const variableCollection = VariableCollection.build([componentContext], variablesMapProjCfg, componentContext);
            expect(variableCollection).to.exist;
            expect(variableCollection).to.be.an.instanceof(VariableCollection);
        });
        it('should skip verifyGivenVariables when component does not expect variables', () => {
            pkg1Comp1Manifest.variables = [];
            const variableCollection = VariableCollection.build([componentContext], variablesMapProjCfg, componentContext);
            expect(variableCollection).to.exist;
            expect(variableCollection).to.be.an.instanceof(VariableCollection);
        });
        it('should throw an error when component expects required variables which are not configured', () => {
            projectConfig.getComponentConfig(pkg1Comp1Cfg.id).variables = new Map();
            projectConfig.getPackages()[0].variables = new Map();
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
            componentContext = new ComponentContext(
                projectConfig.getPackages()[0],
                pkg1Comp1Manifest,
                projectConfig.getComponentConfig(pkg1Comp1Cfg.id),
                true,
            );
            expect(() => VariableCollection.build([componentContext], new Map(), componentContext)).to.throw(expectedErrorMessage);
        });
        it('should throw an error when exposed component variable has wrong type', () => {
            projectConfig.getComponentConfig(pkg1Comp1Cfg.id).variables.set('testNumber', 'wrongType');
            let expectedErrorMessage: string = '';
            expectedErrorMessage += `'${pkg1Comp1Cfg.id}' has issues with its configured variables:\n`;
            expectedErrorMessage += `Has wrongly typed variables:\n`;
            if (pkg1Comp1Manifest.variables) {
                expectedErrorMessage += `* '${pkg1Comp1Manifest.variables[1].name}' has wrong type! Expected ${pkg1Comp1Manifest.variables[1].type} but got string`;
            }
            expect(() => VariableCollection.build([componentContext], variablesMapProjCfg, componentContext)).to.throw(
                expectedErrorMessage,
            );
        });
        it('should allow project scope variables to be passed to other components', () => {
            const variableCollection = VariableCollection.build(
                [componentContext, componentContext2],
                variablesMapProjCfg,
                componentContext,
            );
            expect(variableCollection).to.exist;
            expect(variableCollection).to.be.an.instanceof(VariableCollection);
            expect(variableCollection.substitute('${{ exportedStringConst }}')).to.equal('PROJECT_EXPORTED');
        });
        it('should allow package scope variables to be passed to other components within the same package', () => {
            const variableCollection1 = VariableCollection.build(
                [componentContext, componentContext2, componentContext3],
                variablesMapProjCfg,
                componentContext3,
            );
            const variableCollection2 = VariableCollection.build(
                [componentContext, componentContext2, componentContext3],
                variablesMapProjCfg,
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
            const vars = VariableCollection.build([componentContext], variablesMapProjCfg, componentContext);

            expect(vars.substitute('${{ builtin.package.version }}')).to.equal('v1.1.1');
            expect(vars.substitute('${{ builtin.package.github.org }}')).to.equal('eclipse-velocitas');
            expect(vars.substitute('${{ builtin.package.github.repo }}')).to.equal('test-package');
            expect(vars.substitute('${{ builtin.package.github.ref }}')).to.equal('v1.1.1');
            expect(vars.substitute('${{ builtin.component.id }}')).to.equal('test-component');
        });
        it('should transform variable names into allowed environment variable names', () => {
            const vars = VariableCollection.build([componentContext], variablesMapProjCfg, componentContext);

            const envVars = vars.asEnvVars();
            expect(envVars['builtin_package_version']).to.equal('v1.1.1');
            expect(envVars['builtin_package_github_org']).to.equal('eclipse-velocitas');
            expect(envVars['builtin_package_github_repo']).to.equal('test-package');
            expect(envVars['builtin_package_github_ref']).to.equal('v1.1.1');
            expect(envVars['builtin_component_id']).to.equal('test-component');
        });
        it('should allow one level of variable references', () => {
            const vars = VariableCollection.build([componentContext], variablesMapProjCfg, componentContext);
            expect(vars.substitute('${{ testVariableReference }}')).to.equal(
                'I reference the value of 1 and I am unable to hold another level of reference ${{ testWithDefault }}',
            );
        });
        it('should not throw an error when trying to build VariableCollection with identical VariableDefinition names', () => {
            const buildVariableCollection = () => {
                const alreadyExistingVariableDefName = {
                    name: 'testString',
                    type: 'string',
                    description: 'This is a test duplicate',
                };
                pkg1Comp1Manifest.variables?.push(alreadyExistingVariableDefName);

                const componentContextWithMultipleVariableDef = new ComponentContext(
                    projectConfig.getPackages()[0],
                    pkg1Comp1Manifest,
                    projectConfig.getComponentConfig(pkg1Comp1Cfg.id),
                    true,
                );

                return VariableCollection.build(
                    [componentContextWithMultipleVariableDef],
                    variablesMapProjCfg,
                    componentContextWithMultipleVariableDef,
                );
            };

            expect(buildVariableCollection).not.to.throw();
        });
    });
});
