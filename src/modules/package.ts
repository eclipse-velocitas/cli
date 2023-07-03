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

import { removeSync } from 'fs-extra';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import simpleGit, { SimpleGit } from 'simple-git';
import { Component, ComponentType, deserializeComponentJSON } from './component';
import { DEFAULT_BUFFER_ENCODING } from './constants';
import { ComponentConfig } from './project-config';

export const GITHUB_ORG = 'eclipse-velocitas';
export const GITHUB_API_URL = 'https://api.github.com';
export const GITHUB_ORG_ENDPOINT = `/repos/${GITHUB_ORG}`;
export const MANIFEST_FILE_NAME = 'manifest.json';

export interface PackageManifest {
    components: Array<Component>;
}

export class PackageConfig {
    // name of the package to the package repository
    // @deprecated use repo instead
    repo: string = '';

    // version of the package to use
    version: string = '';

    // package-wide variable configuration
    variables: Map<string, any> = new Map<string, any>();

    // per-component configuration
    components: Array<ComponentConfig> = new Array<ComponentConfig>();

    // enable development mode for package
    dev?: boolean;
}

function isCustomPackage(repository: string): boolean {
    return repository.startsWith('ssh://') || repository.startsWith('http://') || repository.startsWith('https://');
}

/**
 * Return the fully qualified URL to the package repository.
 * In case of Eclipse Velocitas repos which can be referenced by name only,
 * their Github URL is returned.
 *
 * In case of custom URLs as package names, the package name is returned.
 *
 * @param repository The repository of the package.
 * @returns The fully qualified URL to the package repository.
 */
function getPackageRepo(repository: string): string {
    if (isCustomPackage(repository)) {
        return repository;
    }
    return `https://github.com/eclipse-velocitas/${repository}`;
}

function getPackageName(repository: string): string {
    if (!isCustomPackage(repository)) {
        return repository;
    }
    const repoName = repository.substring(repository.lastIndexOf('/') + 1).replace('.git', '');
    return repoName;
}

function getPackageDirectory(repository: string): string {
    return join(getPackageFolderPath(), getPackageName(repository));
}

export function getVelocitasRoot(): string {
    return join(process.env.VELOCITAS_HOME ? process.env.VELOCITAS_HOME : homedir(), '.velocitas');
}

function getPackageFolderPath(): string {
    return join(getVelocitasRoot(), 'packages');
}

export function readPackageManifest(packageConfig: PackageConfig): PackageManifest {
    try {
        const config: PackageManifest = deserializeComponentJSON(
            readFileSync(join(getPackageDirectory(packageConfig.repo), packageConfig.version, MANIFEST_FILE_NAME), DEFAULT_BUFFER_ENCODING)
        );
        return config;
    } catch (error) {
        console.log(`Cannot find component ${packageConfig.getPackageName()}:${packageConfig.version}. Please upgrade or init first!`);
        throw new Error(`Cannot find component ${packageConfig.getPackageName()}:${packageConfig.version}`);
    }
}

export function getComponentByType(packageManifest: PackageManifest, type: ComponentType): Component {
    const component = packageManifest.components.find((component: Component) => component.type === type);
    if (component === undefined) {
        throw new TypeError(`No Subcomponent with type "${type}" found!`);
    }
    return component;
}

export async function getPackageVersions(repo: string): Promise<Array<string>> {
    try {
        const git = await cloneOrUpdateRepo(repo);
        const tagsResult = await git.tags();

        const availableVersions = new Array<string>();
        for (const tagInfo of tagsResult.all) {
            availableVersions.push(tagInfo);
        }
        return availableVersions;
    } catch (error) {
        console.log(error);
    }

    return new Array<string>();
}

async function cloneOrUpdateRepo(repo: string, versionIdentifier?: string, devMode?: boolean): Promise<SimpleGit> {
    let packageDir = getPackageDirectory(repo);
    let cloneOpts = new Array<string>();
    if (versionIdentifier) {
        packageDir = join(packageDir, versionIdentifier);
    } else {
        packageDir = join(packageDir, '_cache');
        cloneOpts.push('--bare');
    }

    if (!existsSync(packageDir)) {
        await simpleGit().clone(getPackageRepo(repo), packageDir, cloneOpts);
    }

    const git = simpleGit(packageDir);
    const localRepoExists = await git.checkIsRepo();
    if (localRepoExists) {
        git.fetch(['--all']);
    } else {
        git.clone(getPackageRepo(repo), packageDir, cloneOpts);
    }

    if (versionIdentifier) {
        await git.checkout(versionIdentifier);
        if (!devMode) {
            removeSync(join(packageDir, '.git'));
        }
    }

    return git;
}

export async function downloadPackageVersion(
    packageRepo: string,
    versionIdentifier: string,
    verbose?: boolean,
    devMode?: boolean
): Promise<void> {
    try {
        await cloneOrUpdateRepo(packageRepo, versionIdentifier, devMode);
    } catch (error) {
        console.error(error);
    }
    return;
}

export function isPackageInstalled(packageName: string, versionIdentifier: string): boolean {
    const packageDir = `${getPackageFolderPath()}/${packageName}/${versionIdentifier}`;
    if (!existsSync(packageDir)) {
        return false;
    }
    return true;
}
