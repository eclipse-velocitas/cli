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

import { cwd } from 'node:process';
import { CliFileSystem } from '../utils/fs-bridge';
import { ComponentContext } from './component';
import { mapReplacer } from './helpers';
import { ProjectCache } from './project-cache';

export enum ScopeIdentifier {
    package = 'package',
    project = 'project',
}

/** Definition of a variable used within the component which may be overwritten by values in the project configuration. */
export interface VariableDefinition {
    // name of the variable
    name: string;

    // description of the variable
    description: string;

    // TypeScript type of the variable
    type: string;

    // Scope in which the variable's value is valid. Defaults to component only.
    scope?: ScopeIdentifier;

    // default value, if any
    default?: any;

    // alternative name for default in case of a constant.
    value?: any;

    // is component defined value constant? Defaults to false.
    constant?: boolean;
}

/** Returns the Github org, if available. */
export function getGithubOrgFromRepoUri(repoUri: string): string | undefined {
    const SLASH = '/';

    let lastSlashIndex = repoUri.lastIndexOf(SLASH);
    if (lastSlashIndex === -1) {
        return undefined;
    }
    const uriWithoutRepo = repoUri.substring(0, lastSlashIndex);
    lastSlashIndex = uriWithoutRepo.lastIndexOf(SLASH);

    if (lastSlashIndex === -1) {
        return undefined;
    }

    return uriWithoutRepo.substring(lastSlashIndex + 1);
}

export class VariableCollection {
    asEnvVars(): NodeJS.ProcessEnv {
        const envVars = Object.assign({}, process.env);

        for (const [key, value] of this._variables.entries()) {
            const transformedKey = key.replaceAll('.', '_');
            const transformedValue = Array.isArray(value) ? JSON.stringify(value) : value;
            Object.assign(envVars, {
                [transformedKey]: transformedValue,
            });
        }

        return envVars;
    }

    private static _addVariablesInScopeToMap(
        projectComponents: ComponentContext[],
        currentComponentContext: ComponentContext,
        variableMap: Map<string, any>,
        usedVariableDefinitions: VariableDefinition[],
    ) {
        // now we scan the all component manifests whether they provide variables which are in scope
        for (const component of projectComponents) {
            if (!component.manifest.variables) {
                continue;
            }

            for (const variableDef of component.manifest.variables) {
                const isCurrentComponent = currentComponentContext.manifest.id === component.manifest.id;

                const isComponentInSamePackage =
                    component.packageConfig.getPackageName() === currentComponentContext.packageConfig.getPackageName();

                const isVariableInScope =
                    isCurrentComponent ||
                    (isComponentInSamePackage && variableDef.scope === ScopeIdentifier.package) ||
                    variableDef.scope === ScopeIdentifier.project;

                if (isVariableInScope) {
                    if (variableMap.has(variableDef.name) && variableDef.constant) {
                        throw Error(
                            `Constant variable '${variableDef.name}' provided by component '${component.manifest.id}' has been set already!`,
                        );
                    }

                    if (!variableMap.has(variableDef.name) && variableDef.default !== undefined) {
                        variableMap.set(variableDef.name, variableDef.default);
                    }

                    const varNameAlreadyExists = usedVariableDefinitions.some((def: VariableDefinition) => def.name === variableDef.name);

                    if (!varNameAlreadyExists) {
                        usedVariableDefinitions.push(variableDef);
                    }
                }
            }
        }
    }

    static build(
        projectComponents: ComponentContext[],
        userDefinedVariableMappings: Map<string, any>,
        currentComponentContext: ComponentContext,
    ): VariableCollection {
        let map = new Map<string, any>();
        let usedVariableDefinitions: VariableDefinition[] = [];

        // first add all user-defined, project-wide variables
        if (userDefinedVariableMappings) {
            map = new Map([...map.entries(), ...userDefinedVariableMappings.entries()]);
        }

        // second add all user-defined, package-wide variables
        if (currentComponentContext.packageConfig.variables) {
            map = new Map([...map.entries(), ...currentComponentContext.packageConfig.variables.entries()]);
        }

        // second add all user-defined, component-wide variables
        if (currentComponentContext.config.variables) {
            map = new Map([...map.entries(), ...currentComponentContext.config.variables.entries()]);
        }

        this._addVariablesInScopeToMap(projectComponents, currentComponentContext, map, usedVariableDefinitions);

        verifyGivenVariables(currentComponentContext.manifest.id, map, usedVariableDefinitions);

        // set built-ins
        map.set('builtin.package.version', currentComponentContext.packageConfig.version);
        map.set('builtin.package.github.org', getGithubOrgFromRepoUri(currentComponentContext.packageConfig.getPackageRepo()));
        map.set('builtin.package.github.repo', currentComponentContext.packageConfig.getPackageName());
        map.set('builtin.package.github.ref', currentComponentContext.packageConfig.version);
        map.set('builtin.component.id', currentComponentContext.manifest.id);

        return new VariableCollection(map);
    }

    substitute(str: string): string {
        for (const kv of this._variables.entries()) {
            str = str.replaceAll(`\$\{\{ ${kv[0]} \}\}`, kv[1]);
        }
        return str;
    }

    private constructor(variables: Map<string, any>) {
        this._variables = variables;
    }

    private _variables: Map<string, any>;
}

class VerifyFlags {
    treatUnusedAsError: Boolean = false;
    treatMissingAsError: Boolean = true;
}

function verifyGivenVariables(
    componentId: string,
    providedVariables: Map<string, any>,
    variableDefinitions?: VariableDefinition[],
    flags = new VerifyFlags(),
) {
    const configuredVars = new Map(providedVariables);
    const missingVars: VariableDefinition[] = [];
    const wronglyTypedVars: string[] = [];

    if (!variableDefinitions || variableDefinitions.length === 0) {
        return;
    }

    for (const componentExposedVariable of variableDefinitions) {
        const configuredValue = configuredVars.get(componentExposedVariable.name);
        const errorMsg = `'${componentExposedVariable.name}' has wrong type! Expected ${
            componentExposedVariable.type
        } but got ${typeof configuredValue}`;
        if (!configuredValue) {
            if (componentExposedVariable.default === undefined) {
                missingVars.push(componentExposedVariable);
            }
        } else {
            if (componentExposedVariable.type === 'array') {
                if (!Array.isArray(configuredValue)) {
                    wronglyTypedVars.push(errorMsg);
                }
            } else if (typeof configuredValue !== componentExposedVariable.type) {
                wronglyTypedVars.push(errorMsg);
            }
            configuredVars.delete(componentExposedVariable.name);
        }
    }
    const errorMessage: string = buildErrorMessageForComponent(componentId, flags, { configuredVars, missingVars, wronglyTypedVars });

    if (errorMessage.length > 0) {
        throw new Error(errorMessage);
    }
}

function buildErrorMessageForComponent(
    componentId: string,
    flags: VerifyFlags,
    vars: { configuredVars: Map<string, any>; missingVars: VariableDefinition[]; wronglyTypedVars: string[] },
): string {
    let errorMessage: string = '';
    if (
        (flags.treatMissingAsError && vars.missingVars.length > 0) ||
        vars.wronglyTypedVars.length > 0 ||
        (flags.treatUnusedAsError && vars.configuredVars.size > 0)
    ) {
        errorMessage = `'${componentId}' has issues with its configured variables:`;
    }

    if (flags.treatMissingAsError) {
        if (vars.missingVars.length > 0) {
            errorMessage += '\nIs missing required variables:\n';
            errorMessage += vars.missingVars
                .flatMap((varDef) => `* '${varDef.name}'\n\tType: ${varDef.type}\n\t${varDef.description}`)
                .join('\n');
        }
    }

    if (vars.wronglyTypedVars.length > 0) {
        errorMessage += '\nHas wrongly typed variables:\n';
        errorMessage += vars.wronglyTypedVars.flatMap((s) => `* ${s}`).join('\n');
    }

    if (flags.treatUnusedAsError) {
        if (vars.configuredVars.size > 0) {
            errorMessage += '\nIs provided unsupported variables:\n';
            for (const [key, value] of vars.configuredVars) {
                errorMessage += `* '${key}'\n`;
            }
        }
    }
    return errorMessage;
}

export function createEnvVars(packagePath: string, variables: VariableCollection, appManifestData?: any): NodeJS.ProcessEnv {
    const projectCache = ProjectCache.read();

    const envVars = Object.assign({}, process.env, {
        VELOCITAS_WORKSPACE_DIR: cwd(),
        VELOCITAS_CACHE_DATA: JSON.stringify(projectCache.raw(), mapReplacer),
        VELOCITAS_CACHE_DIR: ProjectCache.getCacheDir(CliFileSystem.realpathSync(process.cwd())),
        VELOCITAS_PACKAGE_DIR: packagePath,
    });

    if (appManifestData) {
        Object.assign(envVars, {
            VELOCITAS_APP_MANIFEST: JSON.stringify(appManifestData),
        });
    }

    if (variables) {
        Object.assign(envVars, variables.asEnvVars());
    }

    return envVars;
}
