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

import { Command, Flags, ux } from '@oclif/core';
import { APP_MANIFEST_PATH_VARIABLE, AppManifest } from '../../modules/app-manifest';
import { ComponentContext, ExecSpec } from '../../modules/component';
import { ExecExitError, runExecSpec } from '../../modules/exec';
import { ProjectConfig, ProjectConfigLock } from '../../modules/project-config';
import { getMatchedVersion } from '../../modules/semver';
import { createEnvVars } from '../../modules/variables';

export default class Init extends Command {
    static description = 'Initializes Velocitas Vehicle App';

    static examples = [
        `$ velocitas init
        Initializing Velocitas packages ...
        ... Downloading package: 'pkg-velocitas-main:vx.x.x'
        ... Downloading package: 'devenv-devcontainer-setup:vx.x.x'
        ... Downloading package: 'devenv-runtimes:vx.x.x'
        ... Downloading package: 'devenv-github-templates:vx.x.x'
        ... Downloading package: 'devenv-github-workflows:vx.x.x'`,
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

    async run(): Promise<void> {
        const { flags } = await this.parse(Init);
        this.log(`Initializing Velocitas packages ...`);
        const projectConfig = this.initializeOrReadProject();

        const appManifestData = AppManifest.read(projectConfig.getVariableMappings().get(APP_MANIFEST_PATH_VARIABLE));

        await this.ensurePackagesAreDownloaded(projectConfig, flags.force, flags.verbose);

        if (!flags['no-hooks']) {
            projectConfig.validateUsedComponents();
            await this.runPostInitHooks(projectConfig, appManifestData, flags.verbose);
        }

        this.createProjectLockFile(projectConfig, flags.verbose);
    }

    initializeOrReadProject(): ProjectConfig {
        let projectConfig: ProjectConfig;

        if (!ProjectConfig.isAvailable()) {
            this.log('... Directory is no velocitas project. Creating .velocitas.json at the root of your repository.');
            projectConfig = new ProjectConfig(`v${this.config.version}`);
            projectConfig.write();
        } else {
            projectConfig = ProjectConfig.read(`v${this.config.version}`, undefined, true);
        }
        return projectConfig;
    }

    async ensurePackagesAreDownloaded(projectConfig: ProjectConfig, force: boolean, verbose: boolean) {
        for (const packageConfig of projectConfig.getPackages()) {
            const packageVersions = await packageConfig.getPackageVersions();
            const packageVersion = getMatchedVersion(packageVersions, packageConfig.version);

            if (verbose) {
                this.log(`... Resolved '${packageConfig.getPackageName()}:${packageConfig.version}' to version: '${packageVersion}'`);
            }

            packageConfig.setPackageVersion(packageVersion);

            if (!force && packageConfig.isPackageInstalled()) {
                this.log(`... '${packageConfig.getPackageName()}:${packageConfig.version}' already installed.`);
                continue;
            }

            this.log(`... Downloading package: '${packageConfig.getPackageName()}:${packageConfig.version}'`);
            await packageConfig.downloadPackageVersion(verbose);
        }
    }

    async runSinglePostInitHook(
        execSpec: ExecSpec,
        componentContext: ComponentContext,
        projectConfig: ProjectConfig,
        appManifest: any,
        verbose: boolean,
    ): Promise<void> {
        const message = `Running '${execSpec.ref}'`;
        if (!verbose) {
            ux.action.start(message);
        } else {
            this.log(message);
        }
        const envVars = createEnvVars(
            componentContext.packageConfig.getPackageDirectoryWithVersion(),
            projectConfig.getVariableCollection(componentContext),
            appManifest,
        );
        await runExecSpec(execSpec, componentContext.manifest.id, projectConfig, envVars, {
            writeStdout: verbose,
            verbose: verbose,
        });
        if (!verbose) {
            ux.action.stop();
        }
    }

    async runPostInitHooks(projectConfig: ProjectConfig, appManifest: any, verbose: boolean) {
        for (const componentContext of projectConfig.getComponents()) {
            if (!componentContext.manifest.onPostInit || componentContext.manifest.onPostInit.length === 0) {
                continue;
            }

            this.log(`... > Running post init hook for '${componentContext.manifest.id}'`);

            for (const execSpec of componentContext.manifest.onPostInit) {
                try {
                    await this.runSinglePostInitHook(execSpec, componentContext, projectConfig, appManifest, verbose);
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

    createProjectLockFile(projectConfig: ProjectConfig, verbose: boolean): void {
        if (verbose && !ProjectConfigLock.isAvailable()) {
            this.log('... No .velocitas-lock.json found. Creating it at the root of your repository.');
        }
        ProjectConfigLock.write(projectConfig);
    }
}
