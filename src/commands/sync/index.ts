// Copyright (c) 2022-2023 Contributors to the Eclipse Foundation
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
import { ComponentType, findComponentsByType, getComponentConfig, SetupComponent } from '../../modules/component';
import { ProjectConfig } from '../../modules/project-config';
import { installComponent } from '../../modules/setup';
import { VariableCollection } from '../../modules/variables';

export default class Sync extends Command {
    static description = 'Syncs Velocitas components into your repo.';

    static examples = [
        `$ velocitas update MyAwesomeApp --lang cpp
Syncing Velocitas components!
... syncing 'devenv-github-workflows'
... syncing 'devenv-github-templates'`,
    ];

    async run(): Promise<void> {
        this.log(`Syncing Velocitas components!`);
        const projectConfig = ProjectConfig.read(`v${this.config.version}`);
        const setupComponents = findComponentsByType(projectConfig, ComponentType.setup);
        for (const setupComponent of setupComponents) {
            this.log(`... syncing '${setupComponent[0].getPackageName()}'`);

            const componentConfig = getComponentConfig(setupComponent[0], setupComponent[2].id);
            const variables = VariableCollection.build(projectConfig, setupComponent[0], componentConfig, setupComponent[2]);
            installComponent(setupComponent[0], setupComponent[2] as SetupComponent, variables);
        }
    }
}
