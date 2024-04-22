// Copyright (c) 2023-2024 Contributors to the Eclipse Foundation
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
import { mapReplacer } from '../../modules/helpers';
import { ProjectCache } from '../../modules/project-cache';
import { MultiFormatConfigReader } from '../../modules/projectConfig/projectConfigFileReader';

export default class Get extends Command {
    static description = 'Get the complete cache contents as JSON string or the value of a single key.';

    static examples = [
        `$ velocitas cache get
{"foo":"bar"}`,
        `$ velocitas cache get foo
bar`,
    ];

    static args = {
        key: Args.string({ description: 'The key of a single cache entry to get.', required: false }),
    };

    async run(): Promise<void> {
        const { args } = await this.parse(Get);

        // although we are not reading the project config, we want to
        // ensure the command is run in a project directory only.
        MultiFormatConfigReader.read(`v${this.config.version}`);

        const cache = ProjectCache.read();

        let output = JSON.stringify(cache.raw(), mapReplacer);
        if (args.key) {
            output = cache.get(args.key);
        }

        this.log(output);
    }
}
