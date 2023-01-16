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

import { Command, Flags } from '@oclif/core';
import { Component, ComponentType, DeployComponent, ProgramSpec, RuntimeComponent, findComponentByName } from '../../modules/component';
import { ComponentConfig, PackageConfig, ProjectConfig } from '../../modules/project-config';
import { SpawnOptions, spawn } from 'node:child_process';

import { VariableCollection } from '../../modules/variables';
import { createEnvVars } from '../../modules/runtime';
import { getPackageDirectory } from '../../modules/package';
import { join } from 'node:path';
import { readAppManifest } from '../../modules/app-manifest';

function findProgramSpec(
    projectConfig: ProjectConfig,
    componentName: string,
    programId: string
): [PackageConfig, ComponentConfig, Component, ProgramSpec] | undefined {
    const component = findComponentByName(projectConfig, componentName);

    var result: [PackageConfig, ComponentConfig, Component, ProgramSpec] | undefined;

    if (component[2].type === ComponentType.runtime) {
        var runtimeComp = component[2] as RuntimeComponent;
        var programSpec = runtimeComp.programs.find((programSpec) => programSpec.id === programId);
        if (!programSpec) {
            programSpec = runtimeComp.programs.find((programSpec) => programSpec.id === programId);
        }

        if (programSpec) {
            result = [component[0], component[1], runtimeComp, programSpec];
        }
    } else if (component[2].type === ComponentType.deployment) {
        var deployComp = component[2] as DeployComponent;
        programSpec = deployComp.programs.find((programSpec) => programSpec.id === programId);
        if (!programSpec) {
            programSpec = deployComp.programs.find((programSpec) => programSpec.id === programId);
        }

        if (programSpec) {
            result = [component[0], component[1], deployComp, programSpec];
        }
    } else {
        throw Error(`${componentName} is not a runtime or deployment component!`);
    }

    return result;
}

export default class Exec extends Command {
    static description = 'Executes a script contained in one of your installed components.';

    static examples = [
        `$ velocitas exec devenv-runtime-local src/run-mosquitto.sh
Executing script...
`,
    ];

    static strict: boolean = false;

    static args = [
        { name: 'component', description: 'The component which provides the program', required: true },
        { name: 'id', description: 'ID of the program to execute', required: true },
        { name: 'args', description: 'Additional arguments for the program' },
    ];

    static flags = {
        args: Flags.string({ description: 'Args for the executed program', required: false }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Exec);

        const projectConfig = ProjectConfig.read();

        const componentAndProgram = findProgramSpec(projectConfig, args.component, args.id);

        if (!componentAndProgram) {
            this.error(`Program with ID '${args.id}' not found in '${args.component}'`);
        }

        const appManifestData = readAppManifest();

        const variables = VariableCollection.build(projectConfig, componentAndProgram[0], componentAndProgram[1], componentAndProgram[2]);

        const envVars = createEnvVars(appManifestData[0], variables);

        const spawnOptions: SpawnOptions = {
            env: envVars,
            stdio: 'inherit',
        };

        let programArgs: Array<string> = new Array<string>();
        if (flags.args) {
            programArgs = flags.args.split(' ');
            console.log(programArgs);
        }
        const process = spawn(
            join(getPackageDirectory(componentAndProgram[0].name), componentAndProgram[0].version, componentAndProgram[3].executable),
            programArgs,
            spawnOptions
        );
    }
}
