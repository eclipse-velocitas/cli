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

import { Command, Flags, Args } from '@oclif/core';
import { AppManifest } from '../../modules/app-manifest';
import { ExecSpec, findComponentByName } from '../../modules/component';
import { ExecExitError, runExecSpec } from '../../modules/exec';
import { ProjectConfig } from '../../modules/project-config';
import { createEnvVars } from '../../modules/variables';

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
        'args...': Args.string({
            description:
                'Args for the executed program. All arguments and flags provided after the ref are forwarded to the invoked program.',
            required: false,
        }),
    };

    static flags = {
        verbose: Flags.boolean({
            char: 'v',
            aliases: ['verbose'],
            description:
                'Enable verbose logging. The flag may be provided before or in between the 2 positional arguments of exec. Providing the flag after the 2nd positional argument will forward the flag to the invoked program.',
            required: false,
            default: false,
        }),
    };

    private _extractProgramArgsAndFlags(): string[] {
        // we expect 2 positional args: component and program-ref
        // everything after that is an argument for the invoked
        // program.
        // the verbose flag may be anywhere in between but **NOT**
        // after the program-ref.
        let positionalArgsCount = 0;
        let programArgsStartIndex;
        for (programArgsStartIndex = 0; programArgsStartIndex < this.argv.length; ++programArgsStartIndex) {
            if (!this.argv[programArgsStartIndex].startsWith('-')) {
                ++positionalArgsCount;
            }

            if (positionalArgsCount >= 2) {
                break;
            }
        }

        return this.argv.splice(Math.min(programArgsStartIndex + 1, this.argv.length));
    }

    async run(): Promise<void> {
        const programArgsAndFlags = this._extractProgramArgsAndFlags();
        const { args, flags } = await this.parse(Exec);

        const projectConfig = ProjectConfig.read(`v${this.config.version}`);

        const execSpec: ExecSpec = {
            ref: args.ref,
            args: programArgsAndFlags,
        };

        const appManifestData = AppManifest.read();

        const componentContext = findComponentByName(projectConfig, args.component);

        const envVars = createEnvVars(
            componentContext.packageConfig.getPackageDirectoryWithVersion(),
            componentContext.variableCollection,
            appManifestData,
        );

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
