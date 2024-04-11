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
import { PackageConfig } from '../../modules/package';
import { ProjectConfig, ProjectConfigLock } from '../../modules/project-config';
import { resolveVersionIdentifier } from '../../modules/semver';
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
        `$ velocitas init -p devenv-runtimes
        Initializing Velocitas packages ...
        ... Package 'devenv-runtimes:vx.x.x' added to .velocitas.json
        ... Downloading package: 'devenv-runtimes:vx.x.x'
        ... > Running post init hook for ...'`,
        `$ velocitas init -p devenv-runtimes@v3.0.0
        Initializing Velocitas packages ...
        ... Package 'devenv-runtimes:v3.0.0' added to .velocitas.json
        ... Downloading package: 'devenv-runtimes:v3.0.0'
        ... > Running post init hook for ...`,
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
        package: Flags.string({
            char: 'p',
            aliases: ['package'],
            description: '',
            required: false,
            default: '',
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Init);
        this.log(`Initializing Velocitas packages ...`);
        const projectConfig = this._initializeOrReadProject();

        const appManifestData = AppManifest.read(projectConfig.getVariableMappings().get(APP_MANIFEST_PATH_VARIABLE));

        let packageConfigs = projectConfig.getPackages(false);
        if (flags.package !== '') {
            const requestedPackageConfig = this._parsePackageConfig(flags.package);
            await this._resolveVersion(requestedPackageConfig, flags.verbose);
            await this._modifyProjectConfig(requestedPackageConfig, projectConfig, flags.force, flags.verbose);
            await this._ensurePackageIsDownloaded(requestedPackageConfig, flags.force, flags.verbose);
            this._addComponentsToProjectConfig(requestedPackageConfig, projectConfig);
            // projectConfig.validateUsedComponents();
        } else {
            for (const packageConfig of packageConfigs) {
                await this._resolveVersion(packageConfig, flags.verbose);
                await this._ensurePackageIsDownloaded(packageConfig, flags.force, flags.verbose);
            }
            projectConfig.validateUsedComponents();
        }

        if (!flags['no-hooks']) {
            await this._runPostInitHooks(projectConfig, appManifestData, flags.verbose);
        }

        projectConfig.write();
        this._createProjectLockFile(projectConfig, flags.verbose);
    }

    private _addComponentsToProjectConfig(requestedPackageConfig: PackageConfig, projectConfig: ProjectConfig) {
        if (requestedPackageConfig !== null) {
            const providedComponents = requestedPackageConfig.readPackageManifest().components;
            const areComponentsExisting = providedComponents.some((comp) => {
                const enabledComponents = projectConfig.getComponentsFromInstalledPackages().map((comp) => comp.config.id);
                return enabledComponents.indexOf(comp.id) > -1;
            });

            if (!areComponentsExisting) {
                providedComponents.forEach((providedComponent) => {
                    projectConfig.addComponent(providedComponent.id);
                });
            }
        }
    }

    private _parsePackageConfig(packageFlag: string): PackageConfig {
        const hasRequestedVersion = packageFlag.indexOf('@') > -1;

        let repo: string;
        let requestedVersion: string;
        if (hasRequestedVersion) {
            repo = packageFlag.substring(0, packageFlag.indexOf('@'));
            requestedVersion = packageFlag.substring(packageFlag.indexOf('@') + 1);
        } else {
            repo = packageFlag;
            requestedVersion = '';
        }
        return new PackageConfig({ repo: repo, version: requestedVersion });
    }

    private _initializeOrReadProject(): ProjectConfig {
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

    private async _resolveVersion(packageConfig: PackageConfig, verbose: boolean) {
        const packageVersions = await packageConfig.getPackageVersions();
        const packageVersion = resolveVersionIdentifier(packageVersions, packageConfig.version);

        if (verbose) {
            this.log(`... Resolved '${packageConfig.getPackageName()}:${packageConfig.version}' to version: '${packageVersion}'`);
        }

        packageConfig.setPackageVersion(packageVersion);
    }

    private async _modifyProjectConfig(
        requestedPackageConfig: PackageConfig,
        projectConfig: ProjectConfig,
        force: boolean,
        verbose: boolean,
    ) {
        const packageConfigs = projectConfig
            .getPackages()
            .filter((config) => config.getPackageName() === requestedPackageConfig.getPackageName());

        const isPackageExisting = packageConfigs.length >= 1;
        if (!isPackageExisting) {
            this.log(`... Package '${requestedPackageConfig.getPackageName()}:${requestedPackageConfig.version}' added to .velocitas.json`);
            projectConfig.addPackage(requestedPackageConfig);

            packageConfigs.push(requestedPackageConfig);
        } else {
            this.log(`... Package '${requestedPackageConfig.getPackageName()}' exists in .velocitas.json`);
            const existingPackageConfig = packageConfigs.at(0);
            if (existingPackageConfig?.version !== requestedPackageConfig.version) {
                this.log(`... Package '${requestedPackageConfig.getPackageName()}' updated to version ${requestedPackageConfig.version}`);
                existingPackageConfig?.setPackageVersion(requestedPackageConfig.version);
            }
        }
    }

    private async _ensurePackageIsDownloaded(packageConfig: PackageConfig, force: boolean, verbose: boolean) {
        if (!force && packageConfig.isPackageInstalled()) {
            this.log(`... '${packageConfig.getPackageName()}:${packageConfig.version}' already installed.`);
            return;
        }

        this.log(`... Downloading package: '${packageConfig.getPackageName()}:${packageConfig.version}'`);
        await packageConfig.downloadPackageVersion(verbose);
    }

    private async _runSinglePostInitHook(
        execSpec: ExecSpec,
        currentComponentContext: ComponentContext,
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
        const variableCollection = projectConfig.getVariableCollection(currentComponentContext);
        const envVars = createEnvVars(
            currentComponentContext.packageConfig.getPackageDirectoryWithVersion(),
            variableCollection,
            appManifest,
        );
        await runExecSpec(execSpec, currentComponentContext.manifest.id, projectConfig, envVars, {
            writeStdout: verbose,
            verbose: verbose,
        });
        if (!verbose) {
            ux.action.stop();
        }
    }

    private async _runPostInitHooks(projectConfig: ProjectConfig, appManifest: any, verbose: boolean) {
        const components = projectConfig.getComponentsFromInstalledPackages();
        for (const componentContext of components) {
            if (!componentContext.manifest.onPostInit || componentContext.manifest.onPostInit.length === 0) {
                continue;
            }

            this.log(`... > Running post init hook for '${componentContext.manifest.id}'`);

            for (const execSpec of componentContext.manifest.onPostInit) {
                try {
                    await this._runSinglePostInitHook(execSpec, componentContext, projectConfig, appManifest, verbose);
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

    private _createProjectLockFile(projectConfig: ProjectConfig, verbose: boolean): void {
        if (verbose && !ProjectConfigLock.isAvailable()) {
            this.log('... No .velocitas-lock.json found. Creating it at the root of your repository.');
        }
        ProjectConfigLock.write(projectConfig);
    }
}
