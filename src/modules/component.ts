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

import { getComponentByType, PackageManifest, readPackageManifest } from './package';
import { ComponentConfig, PackageConfig, ProjectConfig } from './project-config';
import { VariableDefinition } from './variables';

type IComponent = new () => { readonly type: ComponentType };

const subcomponentTypes: Record<string, IComponent> = {};

function serializable<T extends IComponent>(constructor: T) {
    subcomponentTypes[new constructor().type] = constructor;
    return constructor;
}

export interface ProgramSpec {
    id: string;
    executable: string;
    args: Array<string>;
}

export interface ExecSpec {
    ref: string;
    args: Array<string>;
    startupLine?: string;
    dependsOn?: string;
}

export enum ComponentType {
    runtime = 'runtime',
    deployment = 'deployment',
    setup = 'setup',
}

// Interface definition for implementing components
export interface Component {
    // Unique ID of the component. Needs to be unique over all installed components.
    id: string;

    // A list of all variable definitions exposed by this component.
    variables: Array<VariableDefinition>;

    // A list of programs exposed by this component.
    programs?: Array<ProgramSpec>;

    // Hook which is called after the component has been initialized.
    onPostInit?: Array<ExecSpec>;

    // The type of the component.
    readonly type: ComponentType;
}

@serializable
export class RuntimeComponent implements Component {
    id = '';
    alias = '';
    programs = new Array<ProgramSpec>();
    start = new Array<ExecSpec>();
    stop = new Array<ExecSpec>();
    variables = new Array<VariableDefinition>();
    onPostInit? = new Array<ExecSpec>();
    readonly type = ComponentType.runtime;
}

export interface FileSpec {
    src: string;
    dst: string;
    condition: string;
}

@serializable
export class SetupComponent implements Component {
    id = '';
    files = new Array<FileSpec>();
    variables = new Array<VariableDefinition>();
    programs? = new Array<ProgramSpec>();
    onPostInit? = new Array<ExecSpec>();
    readonly type = ComponentType.setup;
}

@serializable
export class DeployComponent implements Component {
    id = '';
    alias = '';
    programs = new Array<ProgramSpec>();
    start = new Array<ExecSpec>();
    stop = new Array<ExecSpec>();
    variables = new Array<VariableDefinition>();
    onPostInit? = new Array<ExecSpec>();
    readonly type = ComponentType.deployment;
}

export function findComponentsByType<TComponentType extends Component>(
    projectConfig: ProjectConfig,
    type: ComponentType
): Array<[PackageConfig, PackageManifest, TComponentType]> {
    const result = new Array<[PackageConfig, PackageManifest, TComponentType]>();
    for (const packageConfig of projectConfig.packages) {
        const componentManifest = readPackageManifest(packageConfig);
        try {
            result.push([packageConfig, componentManifest, getComponentByType(componentManifest, type) as TComponentType]);
        } catch (e) {}
    }

    return result;
}

export function findComponentByName(projectConfig: ProjectConfig, componentId: string): [PackageConfig, ComponentConfig, Component] {
    let result: [PackageConfig, ComponentConfig, Component] | undefined;
    for (const packageConfig of projectConfig.packages) {
        const packageManifest = readPackageManifest(packageConfig);
        const matchingComponent = packageManifest.components.find((c) => c.id === componentId);
        const matchingComponentConfig = getComponentConfig(packageConfig, componentId);
        if (matchingComponent) {
            result = [packageConfig, matchingComponentConfig, matchingComponent];
            break;
        }
    }

    if (!result) {
        throw Error(`Cannot find component with id '${componentId}'!`);
    }

    return result;
}

export function getComponentConfig(packageConfig: PackageConfig, componentId: string): ComponentConfig {
    var maybeComponentConfig: ComponentConfig | undefined;
    if (packageConfig.components) {
        maybeComponentConfig = packageConfig.components.find((c) => c.id === componentId);
    }
    return maybeComponentConfig ? maybeComponentConfig : new ComponentConfig();
}

const reviver = (_: string, v: any) => {
    if (typeof v === 'object' && 'type' in v && v.type in subcomponentTypes) {
        return Object.assign(new subcomponentTypes[v.type](), v);
    }
    return v;
};

// use this to deserialize JSON instead of plain JSON.parse
export function deserializeComponentJSON(json: string) {
    return JSON.parse(json, reviver);
}
