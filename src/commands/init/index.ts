// Copyright (c) 2022-2024 Contributors to the Eclipse Foundation
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
import { AppManifest } from '../../modules/app-manifest';
import { ExecExitError, runExecSpec } from '../../modules/exec';
import { ProjectConfig } from '../../modules/project-config';
import { createEnvVars } from '../../modules/variables';
import { ComponentContext } from '../../modules/component';

async function runPostInitHook(componentContext: ComponentContext, projectConfig: ProjectConfig, appManifest: any, verbose: boolean) {
    if (!componentContext.manifest.onPostInit || componentContext.manifest.onPostInit.length === 0) {
        return;
    }

    console.log(`... > Running post init hook for '${componentContext.manifest.id}'`);

    for (const execSpec of componentContext.manifest.onPostInit) {
        const message = `Running '${execSpec.ref}'`;
        if (!verbose) {
            ux.action.start(message);
        } else {
            console.log(message);
        }
        const envVars = createEnvVars(
            componentContext.packageConfig.getPackageDirectoryWithVersion(),
            projectConfig.getVariableCollection(componentContext),
            appManifest,
        );
        await runExecSpec(execSpec, componentContext.manifest.id, projectConfig, envVars, { writeStdout: verbose, verbose: verbose });
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
        ['no-hooks']: Flags.boolean({
            description: 'Skip post init hooks',
            required: false,
            default: false,
        }),
    };

    async ensurePackagesAreDownloaded(projectConfig: ProjectConfig, force: boolean, verbose: boolean) {
        for (const packageConfig of projectConfig.getPackages()) {
            if (!force && packageConfig.isPackageInstalled()) {
                this.log(`... '${packageConfig.getPackageName()}:${packageConfig.version}' already initialized.`);
                continue;
            }
            this.log(`... Downloading package: '${packageConfig.getPackageName()}:${packageConfig.version}'`);
            await packageConfig.downloadPackageVersion(verbose);
        }
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(Init);

        this.log(`Initializing Velocitas packages ...`);
        let projectConfig: ProjectConfig;

        const appManifestData = AppManifest.read();

        if (!ProjectConfig.isAvailable()) {
            this.log('... Directory is no velocitas project. Creating .velocitas.json at the root of your repository.');
            projectConfig = new ProjectConfig(`v${this.config.version}`);
            projectConfig.write();
        }
        projectConfig = ProjectConfig.read(`v${this.config.version}`);

        await this.ensurePackagesAreDownloaded(projectConfig, flags.force, flags.verbose);

        if (!flags['no-hooks']) {
            for (const componentContext of projectConfig.getComponents()) {
                try {
                    await runPostInitHook(componentContext, projectConfig, appManifestData, flags.verbose);
                } catch (e) {
                    if (e instanceof ExecExitError) {
                        throw e;
                    } else if (e instanceof Error) {
                        throw new Error(e.message);
                    } else {
                        throw new Error(`An unexpected error occured during initialization of component: ${componentContext.config.id}`);
                    }
                }
            }
        }
    }
}
