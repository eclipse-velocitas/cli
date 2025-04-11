// Copyright (c) 2023-2025 Contributors to the Eclipse Foundation
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

import { Args, Command } from '@oclif/core';
import { ProjectCache } from '../../modules/project-cache';
import { ProjectConfigIO } from '../../modules/projectConfig/projectConfigIO';

export default class Set extends Command {
    static description = 'Set the cache value of an entry.';

    static examples = [`$ velocitas cache set <key> <value>`];

    static args = {
        key: Args.string({ description: 'The cache key to set', required: true }),
        value: Args.string({ description: 'The value to set for the cache key', required: true }),
    };

    async run(): Promise<void> {
        const { args } = await this.parse(Set);

        // although we are not reading the project config, we want to
        // ensure the command is run in a project directory only.
        ProjectConfigIO.read(`v${this.config.version}`);

        const cache = ProjectCache.read();
        cache.set(args.key, args.value);
        cache.write();
    }
}
