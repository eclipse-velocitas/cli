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

import { Command } from '@oclif/core';
import { ProjectCache } from '../../modules/project-cache';
import { ProjectConfigIO } from '../../modules/projectConfig/projectConfigIO';

export default class Directory extends Command {
    static description = "Get the path to a project's cache directory.";

    static examples = [`$ velocitas cache directory`];

    async run(): Promise<void> {
        await this.parse(Directory);

        // although we are not reading the project config, we want to
        // ensure the command is run in a project directory only.
        ProjectConfigIO.read(`v${this.config.version}`);
        this.log(ProjectCache.getCacheDir());
    }
}
