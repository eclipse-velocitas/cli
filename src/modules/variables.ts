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

import { realpathSync } from 'node:fs';
import { cwd } from 'node:process';
import { Component } from './component';
import { mapReplacer } from './helpers';
import { PackageConfig } from './package';
import { ProjectCache } from './project-cache';
import { ComponentConfig, ProjectConfig } from './project-config';

const GITHUB_ORG = 'eclipse-velocitas';

export interface VariableDefinition {
    name: string;
    description: string;
    type: string;
    default?: any;
}

export class VariableCollection {
    asEnvVars(): NodeJS.ProcessEnv {
        const envVars = Object.assign({}, process.env);

        for (const [key, value] of this._variables.entries()) {
            const transformedKey = key.replaceAll('.', '_');

            Object.assign(envVars, {
                [transformedKey]: value,
            });
        }

        return envVars;
    }

    static build(
        projectConfig: ProjectConfig,
        packageConfig: PackageConfig,
        componentConfig: ComponentConfig,
        component: Component,
    ): VariableCollection {
        var map = new Map<string, any>();
        if (projectConfig.variables) {
            map = new Map([...map.entries(), ...projectConfig.variables.entries()]);
        }
        if (packageConfig.variables) {
            map = new Map([...map.entries(), ...packageConfig.variables.entries()]);
        }
        if (componentConfig.variables) {
            map = new Map([...map.entries(), ...componentConfig.variables.entries()]);
        }

        verifyVariables(map, component);

        if (component.variables) {
            for (const variableDef of component.variables) {
                if (!map.has(variableDef.name) && variableDef.default) {
                    map.set(variableDef.name, variableDef.default);
                }
            }
        }

        // set built-ins
        map.set('builtin.package.version', packageConfig.version);
        map.set('builtin.package.github.org', GITHUB_ORG);
        map.set('builtin.package.github.repo', packageConfig.getPackageName());
        map.set('builtin.package.github.ref', packageConfig.version);
        map.set('builtin.component.id', component.id);
        map.set('builtin.component.type', component.type);

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
    variableDefinitions?: Array<VariableDefinition>,
    flags = new VerifyFlags(),
) {
    const configuredVars = new Map(providedVariables);
    const missingVars = new Array<VariableDefinition>();
    const wronglyTypedVars = new Array<string>();

    if (!variableDefinitions || variableDefinitions.length === 0) {
        return;
    }

    for (const componentExposedVariable of variableDefinitions) {
        const configuredValue = configuredVars.get(componentExposedVariable.name);
        if (!configuredValue) {
            if (componentExposedVariable.default === undefined) {
                missingVars.push(componentExposedVariable);
            }
        } else {
            if (typeof configuredValue !== componentExposedVariable.type) {
                wronglyTypedVars.push(
                    `'${componentExposedVariable.name}' has wrong type! Expected ${
                        componentExposedVariable.type
                    } but got ${typeof configuredValue}`,
                );
            }
            configuredVars.delete(componentExposedVariable.name);
        }
    }
    const errorMessage: string = buildErrorMessageForComponent(componentId, flags, { configuredVars, missingVars, wronglyTypedVars });

    if (errorMessage.length > 0) {
        throw new Error(errorMessage);
    }
}

function verifyVariables(variables: Map<string, any>, component: Component): void {
    verifyGivenVariables(component.id, variables, component.variables);
}

function buildErrorMessageForComponent(
    componentId: string,
    flags: VerifyFlags,
    vars: { configuredVars: Map<string, any>; missingVars: Array<VariableDefinition>; wronglyTypedVars: Array<string> },
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

export function createEnvVars(variables: VariableCollection, appManifestData?: any): NodeJS.ProcessEnv {
    const projectCache = ProjectCache.read();

    const envVars = Object.assign({}, process.env, {
        VELOCITAS_WORKSPACE_DIR: cwd(),
        VELOCITAS_CACHE_DATA: JSON.stringify(projectCache.raw(), mapReplacer),
        VELOCITAS_CACHE_DIR: ProjectCache.getCacheDir(realpathSync(process.cwd())),
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
