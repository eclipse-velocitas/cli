// Copyright (c) 2023 Robert Bosch GmbH
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
import { createProject } from '../../modules/project-creation';

export default class Create extends Command {
    static description = 'Creates a new Vehicle Application';

    static examples = [];

    static flags = {
        verbose: Flags.boolean({ char: 'v', aliases: ['verbose'], description: 'Enable verbose logging', required: false }),
        force: Flags.boolean({ char: 'f', aliases: ['force'], description: 'Force (re-)download packages', required: false }),
    };

    static args = [{ name: 'name', description: 'Name of the application', required: true }];

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Create);

        this.log(`Creating Vehicle Application ...`);

        await createProject(args.name, 'python');
    }
}
