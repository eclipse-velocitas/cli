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

import { Command, Flags, Args } from '@oclif/core';
import { readAppManifest } from '../../modules/app-manifest';
import { ExecSpec, findComponentByName } from '../../modules/component';
import { ExecExitError, runExecSpec } from '../../modules/exec';
import { ProjectConfig } from '../../modules/project-config';
import { createEnvVars, VariableCollection } from '../../modules/variables';

export default class Exec extends Command {
    static description = 'Executes a script contained in one of your installed components.';

    static examples = [
        `$ velocitas exec devenv-runtime-local run-mosquitto
Executing script...
`,
    ];

    static strict = false;

    static args = {
        component: Args.string({ description: 'The component which provides the program', required: true }),
        ref: Args.string({ description: 'Reference to the ID of the program to execute', required: true }),
        'args...': Args.string({ description: 'Args for the executed program', required: false }),
    };

    static flags = {
        verbose: Flags.boolean({ char: 'v', aliases: ['verbose'], description: 'Enable verbose logging', required: false, default: false }),
        args: Flags.string({ description: 'Args for the executed program', multiple: true, required: false }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Exec);

        const projectConfig = ProjectConfig.read();

        // OCLIF does not support varargs (lists) out of the box.
        // Their suggestion is to set "strict" argument parsing to false but no further documentation is available.
        // Hence we access the Command.argv attribute which holds all arguments passed to the CLI
        // and access everything STARTING AFTER the args."ref" argument as "custom args" for the invoked program.
        const customArgsOffset = Object.keys(args).indexOf('ref') + 1;
        const execArgs: string[] = this.argv.length > customArgsOffset ? this.argv.slice(customArgsOffset) : [];

        const execSpec: ExecSpec = {
            ref: args.ref,
            args: execArgs,
        };

        const appManifestData = readAppManifest();

        const [packageConfig, componentConfig, component] = findComponentByName(projectConfig, args.component);

        const variables = VariableCollection.build(projectConfig, packageConfig, componentConfig, component);

        const envVars = createEnvVars(variables, appManifestData[0]);

        try {
            await runExecSpec(execSpec, args.component, projectConfig, envVars, { verbose: flags.verbose });
        } catch (e) {
            if (e instanceof ExecExitError) {
                this.error(e.message, { exit: e.exitCode });
            } else if (e instanceof Error) {
                this.error(e.message);
            } else {
                this.error(`An unexpected error occured during execution of component: ${args.component}`);
            }
        }
    }
}
