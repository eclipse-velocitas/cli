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
import { readAppManifest } from '../../modules/app-manifest';
import { ComponentType, findComponentsByType, getComponentConfig, RuntimeComponent } from '../../modules/component';
import { ProjectConfig } from '../../modules/project-config';
import { RuntimeArgs, RuntimeFlags, RuntimeSpawnOptions, spawnProcessesInOrder } from '../../modules/runtime';
import { createEnvVars, VariableCollection } from '../../modules/variables';

export default class Start extends Command {
    static description = 'Starts a specific runtime';

    static examples = [
        `$ velocitas runtime start local
Starting runtime 'local'
`,
    ];

    static flags = {
        detach: Flags.boolean({ char: 'd', aliases: ['detach'], description: 'Start the runtime in detached mode', required: false }),
        verbose: Flags.boolean({ char: 'v', aliases: ['verbose'], description: 'Start the verbose logging', required: false }),
    };

    static args = [{ name: 'alias', description: 'Alias of the runtime to bring up', required: true }];

    async run(): Promise<void> {
        const { args, flags }: { args: RuntimeArgs; flags: RuntimeFlags } = await this.parse(Start);

        const projectConfig = ProjectConfig.read();

        const runtimes = findComponentsByType<RuntimeComponent>(projectConfig, ComponentType.runtime)!;
        const runtime = runtimes.find((runtime) => runtime[2].alias === args.alias)!;
        const componentConfig = getComponentConfig(runtime[0], runtime[2].id);

        const variables = VariableCollection.build(projectConfig, runtime[0], componentConfig, runtime[2]);

        const appManifestData = readAppManifest();

        const envVars = createEnvVars(variables, appManifestData[0]);

        const runtimeSpawnOptions: RuntimeSpawnOptions = {
            config: projectConfig,
            componentConfig: runtime[0],
            runtime: runtime[2],
            envVars: envVars,
            key: 'start',
            runtimeFlags: flags,
        };

        await spawnProcessesInOrder(runtimeSpawnOptions);
    }
}
