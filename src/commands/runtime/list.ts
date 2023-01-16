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
import { ComponentType, findComponentsByType, RuntimeComponent } from '../../modules/component';
import { ProjectConfig } from '../../modules/project-config';

export default class List extends Command {
    static description = 'Lists available runtimes';

    static examples = [
        `$ velocitas runtime list
Available runtimes:
* local
* k3d
`,
    ];

    async run(): Promise<void> {
        await this.parse(List);
        const projectConfig = ProjectConfig.read();
        const runtimes = findComponentsByType<RuntimeComponent>(projectConfig, ComponentType.runtime);

        this.log('Available runtimes:');
        for (const runtime of runtimes) {
            this.log(`* ${runtime[2].alias}`);
        }
    }
}
