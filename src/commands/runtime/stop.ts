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

import { ComponentType, RuntimeComponent, findComponentsByType, getComponentConfig } from '../../modules/component';
import { RuntimeArgs, RuntimeSpawnOptions, createEnvVars, spawnProcessesInOrder } from '../../modules/runtime';

import { Command } from '@oclif/core';
import { ProjectConfig } from '../../modules/project-config';
import { VariableCollection } from '../../modules/variables';
import { readAppManifest } from '../../modules/app-manifest';

export default class Stop extends Command {
    static description = 'Stops a specific runtime';

    static examples = [
        `$ velocitas runtime stop local
Stopping runtime 'local'
`,
    ];

    static flags = {};

    static args = [{ name: 'alias', description: 'Alias of the runtime to stop', required: true }];

    async run(): Promise<void> {
        const { args }: { args: RuntimeArgs } = await this.parse(Stop);

        const projectConfig = ProjectConfig.read();

        const runtimes = findComponentsByType<RuntimeComponent>(projectConfig, ComponentType.runtime);
        const runtime = runtimes.find((runtime) => runtime[2].alias === args.alias)!;
        const componentConfig = getComponentConfig(runtime[0], runtime[2].id);

        const variables = VariableCollection.build(projectConfig, runtime[0], componentConfig, runtime[2]);

        const appManifestData = readAppManifest();

        const envVars = createEnvVars(appManifestData[0], variables);

        const runtimeSpawnOptions: RuntimeSpawnOptions = {
            config: projectConfig,
            componentConfig: runtime[0],
            runtime: runtime[2],
            envVars: envVars,
            key: 'stop',
        };

        await spawnProcessesInOrder(runtimeSpawnOptions);
    }
}
