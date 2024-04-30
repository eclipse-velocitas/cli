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

import { Args, Command } from '@oclif/core';
import { ProjectConfigIO } from '../../modules/projectConfig/projectConfigIO';

export default class Remove extends Command {
    static description = 'Remove project components.';

    static examples = [`$ velocitas component remove <id>`];

    static args = {
        id: Args.string({ description: 'ID of the component to remove', required: true }),
    };

    async run(): Promise<void> {
        const { args } = await this.parse(Remove);

        const projectConfig = ProjectConfigIO.read(`v${this.config.version}`);

        const foundComponent = projectConfig.getComponentContexts(false).find((compContext) => compContext.manifest.id === args.id);

        if (!foundComponent) {
            throw Error(
                `Component '${args.id}' does not exist in any referenced package! Did you add the correct package via 'velocitas package' command?`,
            );
        }

        if (!foundComponent.usedInProject) {
            throw Error(`Component '${args.id}' is not part of the project!`);
        }

        projectConfig.removeComponent(foundComponent?.manifest.id);
        ProjectConfigIO.write(projectConfig);
    }
}
