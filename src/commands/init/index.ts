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

import { ux, Command, Flags } from '@oclif/core';
import { AppManifest, readAppManifest } from '../../modules/app-manifest';
import { Component } from '../../modules/component';
import { ExecExitError, runExecSpec } from '../../modules/exec';
import { downloadPackageVersion, isPackageInstalled, readPackageManifest } from '../../modules/package';
import { ComponentConfig, PackageConfig, ProjectConfig } from '../../modules/project-config';
import { createEnvVars, VariableCollection } from '../../modules/variables';

async function runPostInitHook(
    component: Component,
    packageConfig: PackageConfig,
    projectConfig: ProjectConfig,
    appManifest: AppManifest,
    verbose: boolean,
) {
    if (!component.onPostInit || component.onPostInit.length === 0) {
        return;
    }

    console.log(`... > Running post init hook for '${component.id}'`);

    const maybeComponentConfig = packageConfig.components?.find((c) => c.id === component.id);
    const componentConfig = maybeComponentConfig ? maybeComponentConfig : new ComponentConfig();
    const variables = VariableCollection.build(projectConfig, packageConfig, componentConfig, component);

    for (const execSpec of component.onPostInit) {
        const message = `Running '${execSpec.ref}'`;
        if (!verbose) {
            ux.action.start(message);
        } else {
            console.log(message);
        }
        const envVars = createEnvVars(variables, appManifest);
        await runExecSpec(execSpec, component.id, projectConfig, envVars, { writeStdout: verbose, verbose: verbose });
        if (!verbose) {
            ux.action.stop();
        }
    }
}

export default class Init extends Command {
    static description = 'Initializes Velocitas Vehicle App';

    static examples = [
        `$ velocitas init
Initializing Velocitas Vehicle App!
Velocitas project found!
... 'devenv-runtime-local:v1.0.11' already initialized.
... 'devenv-runtime-k3d:v1.0.5' already initialized.
... 'devenv-github-workflows:v1.0.1' already initialized.
... 'devenv-github-templates:v1.0.1' already initialized.`,
    ];

    static flags = {
        verbose: Flags.boolean({ char: 'v', aliases: ['verbose'], description: 'Enable verbose logging', required: false, default: false }),
        force: Flags.boolean({
            char: 'f',
            aliases: ['force'],
            description: 'Force (re-)download packages',
            required: false,
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Init);

        this.log(`Initializing Velocitas packages ...`);
        let projectConfig: ProjectConfig;

        const appManifestData = readAppManifest();

        if (ProjectConfig.isAvailable()) {
            projectConfig = ProjectConfig.read();

            for (const packageConfig of projectConfig.packages) {
                if (!flags.force && isPackageInstalled(packageConfig.name, packageConfig.version)) {
                    this.log(`... '${packageConfig.name}:${packageConfig.version}' already initialized.`);
                    continue;
                }

                this.log(`... Downloading package: '${packageConfig.name}:${packageConfig.version}'`);
                await downloadPackageVersion(packageConfig.name, packageConfig.version, flags.verbose);

                const packageManifest = readPackageManifest(packageConfig);

                for (const component of packageManifest.components) {
                    try {
                        await runPostInitHook(component, packageConfig, projectConfig, appManifestData[0], flags.verbose);
                    } catch (e) {
                        if (e instanceof ExecExitError) {
                            this.error(e.message, { exit: e.exitCode });
                        } else if (e instanceof Error) {
                            this.error(e.message);
                        } else {
                            this.error(`An unexpected error occured during initialization of component: ${component.id}`);
                        }
                    }
                }
            }
        } else {
            this.log('... Creating .velocitas.json at the root of your repository.');
            projectConfig = new ProjectConfig();
            projectConfig.write();
        }
    }
}
