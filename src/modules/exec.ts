// Copyright (c) 2023 Robert Bosch GmbH
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

import { spawn, SpawnOptions } from 'node:child_process';
import { join, resolve } from 'node:path';
import { ExecSpec, findComponentByName } from './component';
import { getPackageDirectory } from './package';
import { ProjectCache } from './project-cache';
import { ProjectConfig } from './project-config';

const CACHE_OUTPUT_REGEX: RegExp = /(\w+)\s*=\s*(\'.*?\'|\".*?\"|\w+)\s+\>\>\s+VELOCITAS_CACHE/;

const lineCapturer = (projectCache: ProjectCache, data: string) => {
    for (let line of data.toString().split('\n')) {
        let lineTrimmed = (line as string).trim();

        if (lineTrimmed.length === 0) {
            continue;
        }

        console.log(lineTrimmed);

        const result = CACHE_OUTPUT_REGEX.exec(lineTrimmed);
        if (result && result.length > 0) {
            const key = result[1];
            const value = result[2].replaceAll("'", '').replaceAll('"', '');
            projectCache.set(key, value);
        }
    }
};

async function awaitSpawn(command: string, args: readonly string[], options: SpawnOptions): Promise<number | null> {
    const projectCache = ProjectCache.read();
    let p = spawn(command, args, options);
    p.stdout!.on('data', (data) => lineCapturer(projectCache, data));
    p.stderr!.on('data', (data) => lineCapturer(projectCache, data));

    return new Promise((resolveFunc) => {
        p.on('exit', (code) => {
            resolveFunc(code);
            projectCache.write();
        });
    });
}

export async function runExecSpec(
    execSpec: ExecSpec,
    componentId: string,
    projectConfig: ProjectConfig,
    envVars: NodeJS.ProcessEnv,
    verbose?: boolean
) {
    if (verbose) {
        console.info(`Starting ${componentId}/${execSpec.ref}`);
    }

    const [packageConfig, , component] = findComponentByName(projectConfig, componentId);

    if (!component.programs) {
        throw new Error(`Component '${componentId}' has no exposed programs!`);
    }

    const programSpec = component.programs.find((prog) => prog.id === execSpec.ref);
    if (!programSpec) {
        throw new Error(`No program found for item '${execSpec.ref}' referenced in program list of '${component.id}'`);
    }

    const cwd = join(getPackageDirectory(packageConfig.name), packageConfig.version);
    const spawnOptions: SpawnOptions = {
        env: envVars,
        stdio: 'pipe',
        cwd: cwd,
    };

    let programArgs = programSpec.args ? programSpec.args : [];
    if (execSpec.args !== undefined && execSpec.args.length > 0) {
        programArgs = execSpec.args;
    }

    try {
        const command = programSpec.executable.includes('/') ? resolve(cwd, programSpec.executable) : programSpec.executable;
        await awaitSpawn(command, programArgs, spawnOptions);
    } catch (error) {
        console.error(`There was an error during exec:\n${error}`);
    }
}
