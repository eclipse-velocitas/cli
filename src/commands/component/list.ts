// Copyright (c) 2024 Contributors to the Eclipse Foundation
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
import { ProjectConfig } from '../../modules/project-config';

export default class List extends Command {
    static description = 'List project components.';

    static examples = [`$ velocitas component list`];

    static flags = {
        unused: Flags.boolean({ char: 'u', aliases: ['unused'], description: 'Shows unused components', required: false, default: false }),
        all: Flags.boolean({
            char: 'a',
            aliases: ['all'],
            description: 'Shows all components',
            required: false,
            default: false,
            exclusive: ['unused'],
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(List);

        const projectConfig = ProjectConfig.read(`v${this.config.version}`);
        const onlyUsed = !flags.all && !flags.unused;

        for (const componentContext of projectConfig.getComponents(onlyUsed)) {
            if (flags.unused && componentContext.usedInProject) {
                continue;
            }

            let usageString = '';
            if (!onlyUsed && componentContext.usedInProject) {
                usageString = ' [used]';
            }

            this.log(`- id: '${componentContext.manifest.id}'${usageString}`);

            if (componentContext.manifest.description) {
                this.log(`  description: '${componentContext.manifest.description}'`);
            }

            this.log(`  providedBy: ${componentContext.packageConfig.getPackageName()}`);
        }
    }
}
