// Copyright (c) 2024-2025 Contributors to the Eclipse Foundation
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
import { ComponentContext } from '../../modules/component';
import { ProjectConfigIO } from '../../modules/projectConfig/projectConfigIO';

export default class Add extends Command {
    static description = 'Add project components.';

    static examples = [`$ velocitas component add <id>`];

    static args = {
        id: Args.string({ description: 'ID of the component to add', required: true }),
    };

    async run(): Promise<void> {
        const { args } = await this.parse(Add);

        const projectConfig = ProjectConfigIO.read(`v${this.config.version}`);
        const foundComponent = projectConfig
            .getComponentContexts(false)
            .find((compContext: ComponentContext) => compContext.manifest.id === args.id);

        if (!foundComponent) {
            throw Error(
                `Component '${args.id}' does not exist in any referenced package! Did you add the correct package via 'velocitas package' command?`,
            );
        }

        if (foundComponent.usedInProject) {
            throw Error(`Component '${args.id}' already added to project!`);
        }

        projectConfig.addComponent(foundComponent?.manifest.id);
        ProjectConfigIO.write(projectConfig);
    }
}
