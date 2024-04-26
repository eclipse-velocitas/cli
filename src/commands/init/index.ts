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

interface InitFlags {
    verbose: boolean;
    force: boolean;
    ['no-hooks']: boolean;
    package: string;
    specifier: string;
}

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
        `$ velocitas init -p devenv-runtimes -s v3.0.0
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
            description: `Specify a specific package for initialisation. For standard packages the name can be used, e.g.: devenv-runtimes. 
            For custom packages a git URL can be used, e.g: https://github.com/eclipse-velocitas/devenv-github-workflows.git.`,
            required: false,
            default: '',
        }),
        specifier: Flags.string({
            char: 's',
            aliases: ['specifier'],
            description: `The specifier can be used to provide a specific version of the package to be used. 
            A git tag (e.g. 'v3.0.0') or commit hash (e.g. '123abc45') can be provided as input`,
            required: false,
            default: '',
            dependsOn: ['package'],
        }),
    };

    async run(): Promise<void> {
        const { flags }: { flags: InitFlags } = await this.parse(Init);
        this.log(`Initializing Velocitas packages ...`);
        let requestedPackageConfig: PackageConfig;
        const projectConfig = this._initializeOrReadProject();

        const appManifestData = AppManifest.read(projectConfig.getVariableMappings().get(APP_MANIFEST_PATH_VARIABLE));

        if (flags.package) {
            requestedPackageConfig = await this._handleSinglePackageInit(projectConfig, flags);
        } else {
            await this._handleCompletePackageInit(projectConfig, flags);
        }

        if (!flags['no-hooks']) {
            let components: ComponentContext[];
            if (flags.package) {
                components = projectConfig.getComponentsForPackageConfig(requestedPackageConfig!);
            } else {
                components = projectConfig.getComponents();
            }

            await this._runPostInitHooks(components, projectConfig, appManifestData, flags.verbose);
        }

        this._createProjectLockFile(projectConfig, flags.verbose);
    }

    private async _handleCompletePackageInit(projectConfig: ProjectConfig, flags: InitFlags) {
        await this._ensurePackagesAreDownloaded(projectConfig.getPackages(), flags);
        projectConfig.validateUsedComponents();
    }

    private async _handleSinglePackageInit(projectConfig: ProjectConfig, flags: InitFlags): Promise<PackageConfig> {
        const packageConfig = new PackageConfig({ repo: flags.package, version: flags.specifier });
        await this._resolveVersion(packageConfig, flags.verbose);

        const existingPackage = projectConfig.getPackageConfig(packageConfig.getPackageName());
        if (existingPackage) {
            if (existingPackage.version !== packageConfig.version) {
                projectConfig.updatePackageConfig(packageConfig);
                this.log(`... Updating '${packageConfig.getPackageName()}' to version '${packageConfig.version}' in .velocitas.json`);
            }
        } else {
            projectConfig.addPackageConfig(packageConfig);
            this.log(`... Package '${packageConfig.getPackageName()}:${packageConfig.version}' added to .velocitas.json`);
        }

        await this._ensurePackagesAreDownloaded([packageConfig], flags);
        this._finalizeSinglePackageInit(packageConfig, projectConfig);

        return packageConfig;
    }

    private _finalizeSinglePackageInit(requestedPackageConfig: PackageConfig, projectConfig: ProjectConfig): void {
        const providedComponents = requestedPackageConfig.readPackageManifest().components;
        const areComponentsExisting = providedComponents.some((comp) => {
            const enabledComponents = projectConfig.getComponents(undefined, true).map((comp) => comp.config.id);
            return enabledComponents.indexOf(comp.id) > -1;
        });

        if (!areComponentsExisting) {
            providedComponents.forEach((providedComponent) => {
                projectConfig.addComponent(providedComponent.id);
            });
        }

        projectConfig.write();
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

    private async _ensurePackagesAreDownloaded(packageConfigs: PackageConfig[], flags: InitFlags) {
        for (const packageConfig of packageConfigs) {
            await this._resolveVersion(packageConfig, flags.verbose);

            if (!flags.force && packageConfig.isPackageInstalled()) {
                this.log(`... '${packageConfig.getPackageName()}:${packageConfig.version}' already installed.`);
                continue;
            }

            this.log(`... Downloading package: '${packageConfig.getPackageName()}:${packageConfig.version}'`);
            await packageConfig.downloadPackageVersion(flags.verbose);
        }
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
        const envVars = createEnvVars(
            currentComponentContext.packageConfig.getPackageDirectoryWithVersion(),
            projectConfig.getVariableCollection(currentComponentContext),
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

    private async _runPostInitHooks(components: ComponentContext[], projectConfig: ProjectConfig, appManifest: any, verbose: boolean) {
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
