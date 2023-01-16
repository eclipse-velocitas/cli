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

import { Command } from '@oclif/core';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { readAppManifest } from '../../modules/app-manifest';
import { ComponentType, DeployComponent, findComponentsByType, getComponentConfig } from '../../modules/component';
import { getPackageDirectory } from '../../modules/package';
import { ProjectConfig } from '../../modules/project-config';
import { createEnvVars } from '../../modules/runtime';
import { VariableCollection } from '../../modules/variables';

export default class Deploy extends Command {
    static description = 'Deploys your Vehicle App to a runtime';

    static examples = [
        `$ velocitas deploy local
Deploying app to runtime 'local'...
`,
    ];

    static flags = {};

    static args = [{ name: 'runtime', description: 'Name of the runtime to deploy to', required: true }];

    async run(): Promise<void> {
        const { args } = await this.parse(Deploy);

        const projectConfig = ProjectConfig.read();
        const deployments = findComponentsByType<DeployComponent>(projectConfig, ComponentType.deployment)!;
        const deployment = deployments.find((deployment) => deployment[2].alias === args.runtime)!;
        const componentConfig = getComponentConfig(deployment[0], deployment[2].id);
        const appManifestData = readAppManifest();

        const variables = VariableCollection.build(projectConfig, deployment[0], componentConfig, deployment[2]);
        const envVars = createEnvVars(appManifestData[0], variables);
        const runtimeVersion = projectConfig.packages.find((c) => c.name === deployment![0].name)?.version;

        const proc = spawn(join(getPackageDirectory(deployment[0].name), runtimeVersion!, deployment[2].start[0].id), [], {
            env: envVars,
            detached: true,
        });

        proc.stdout.on('data', (data) => {
            console.log(`${data}`);
        });

        proc.stderr.on('data', (data) => {
            console.error(`${data}`);
        });

        proc.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });
    }
}
