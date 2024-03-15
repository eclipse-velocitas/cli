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

import { PackageConfig } from './package.js';
import { VariableDefinition } from './variables.js';

/**
 * Specification of a program that is exported by a component to be used via `velocitas exec`.
 */
export interface ProgramSpec {
    // Unique ID of the program. Needs to be unique within one component.
    id: string;

    // Short description of the program and that it is doing.
    description?: string;

    // Path to the executable (relative to the package root) of the exposed program.
    executable: string;

    // Default arguments passed to the invoked program upon execution.
    args?: string[];
}

/**
 * Execution specification which invokes an exposed program and is able to model
 * execution dependencies as well as successful startup.
 */
export interface ExecSpec {
    // Reference to the id of the exposed program.
    ref: string;

    // Additional arguments to be passed to the exposed program.
    args?: string[];

    // Regular expression which identifies a successful startup of the program.
    startupLine?: string;

    // A reference to another exposed program that this one depends on.
    dependsOn?: string;
}

/**
 * File copy specification. Describes a file or set of files to be copied from a
 * source to a destination.
 */
export interface FileSpec {
    // The source file path or directory path (relative to the package root).
    src: string;

    // The destination file path or directory path (relative to the workspace root).
    dst: string;

    // The condition which has to be fulfilled for the copy to execute. Is evaluated as JS condition.
    condition: string;
}

/**
 * Manifest describing the capabilities and interfaces of a component.
 */
export interface ComponentManifest {
    // Unique ID of the component. Needs to be unique over all installed components.
    id: string;

    // A list of files that need to be copied from source to target when running `velocitas sync`.
    files?: FileSpec[];

    // A list of all variable definitions exposed by this component.
    variables?: VariableDefinition[];

    // A list of programs exposed by this component.
    programs?: ProgramSpec[];

    // Hook which is called after the component has been initialized.
    onPostInit?: ExecSpec[];
}

/** Configuration of a component within a project configuration. */
export class ComponentConfig {
    // ID of the component
    id: string;

    // component-wide variable configuration
    variables?: Map<string, any>;

    constructor(id: string) {
        this.id = id;
    }
}

/** The context in which a component is used. It holds all necessary information to operate on a component. */
export class ComponentContext {
    public packageConfig: PackageConfig;
    public manifest: ComponentManifest;
    public config: ComponentConfig;

    constructor(packageReference: PackageConfig, manifest: ComponentManifest, config: ComponentConfig) {
        this.packageConfig = packageReference;
        this.manifest = manifest;
        this.config = config;
    }
}
