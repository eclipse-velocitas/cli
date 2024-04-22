// Copyright (c) 2023-2024 Contributors to the Eclipse Foundation
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

import { IPty, spawn } from 'node-pty';
import { exec } from 'node:child_process';
import { join, resolve } from 'node:path';
import { ExecSpec, ProgramSpec } from './component';
import { ProjectCache } from './project-cache';
import { ProjectConfig } from './projectConfig/projectConfig';

const CACHE_OUTPUT_REGEX: RegExp = /(\w+)\s*=\s*(\'.*?\'|\".*?\"|\w+)\s+\>\>\s+VELOCITAS_CACHE/;

const lineCapturer = (projectCache: ProjectCache, writeStdout: boolean, data: string) => {
    if (writeStdout) {
        process.stdout.write(data);
    }
    for (let line of data.toString().split('\n')) {
        let lineTrimmed = (line as string).trim();

        if (lineTrimmed.length === 0) {
            continue;
        }
        const result = CACHE_OUTPUT_REGEX.exec(lineTrimmed);
        if (result && result.length > 0) {
            const key = result[1];
            const value = result[2].replaceAll("'", '').replaceAll('"', '');
            projectCache.set(key, value);
        }
    }
};

export function setSpawnImplementation(func: (command: string, args: string | string[], options: any) => IPty) {
    ptySpawn = func;
}

var ptySpawn = (command: string, args: string | string[], options: any): IPty => spawn(command, args, options);

export async function awaitSpawn(
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    writeStdout: boolean,
): Promise<{ exitCode: number; signal?: number } | null> {
    const projectCache = ProjectCache.read();

    var ptyProcess = ptySpawn(command, args, {
        cwd: cwd,
        env: env as any,
    });

    ptyProcess.onData((data) => lineCapturer(projectCache, writeStdout, data));

    process.stdin.on('data', ptyProcess.write.bind(ptyProcess));

    return new Promise((resolveFunc) => {
        // Needed to kill all childprocesses inside the spawned tty to avoid having leftovers
        const sigintCallback = () => {
            const spawnedTtyId = (ptyProcess as any)._pty.split('/dev/')[1];
            exec(`pkill -t ${spawnedTtyId}`);
        };
        process.on('SIGINT', sigintCallback);
        ptyProcess.onExit((code) => {
            if (process.stdin) {
                process.stdin.unref();
            }
            ptyProcess.kill();
            resolveFunc(code);
            projectCache.write();
        });
        process.removeListener('SIGINT', sigintCallback);
        process.stdin.removeAllListeners('data');
    });
}

export class ExecExitError extends Error {
    exitCode: number;
    constructor(message: string, exitCode: number) {
        super(message);
        this.name = 'ExecExitError';
        this.exitCode = exitCode;
    }
}

export async function runExecSpec(
    execSpec: ExecSpec,
    componentId: string,
    projectConfig: ProjectConfig,
    envVars: NodeJS.ProcessEnv,
    loggingOptions: { writeStdout?: boolean; verbose?: boolean } = { writeStdout: true, verbose: false },
) {
    if (loggingOptions.writeStdout === undefined) {
        loggingOptions.writeStdout = true;
    }

    if (loggingOptions.verbose === undefined) {
        loggingOptions.verbose = false;
    }

    if (loggingOptions.verbose) {
        console.info(`Starting ${componentId}/${execSpec.ref}`);
    }

    const componentContext = projectConfig.findComponentByName(componentId);

    if (!componentContext.manifest.programs) {
        throw new Error(`Component '${componentId}' has no exposed programs!`);
    }

    const programSpec = componentContext.manifest.programs.find((prog: ProgramSpec) => prog.id === execSpec.ref);
    if (!programSpec) {
        throw new Error(`No program found for item '${execSpec.ref}' referenced in program list of '${componentId}'`);
    }

    const cwd = join(componentContext.packageConfig.getPackageDirectory(), componentContext.packageConfig.version);

    let programArgs = programSpec.args ? programSpec.args : [];
    if (execSpec.args && execSpec.args.length > 0) {
        programArgs = programArgs.concat(execSpec.args);
    }

    try {
        const command = programSpec.executable.includes('/') ? resolve(cwd, programSpec.executable) : programSpec.executable;
        const result = await awaitSpawn(command, programArgs, cwd, envVars, loggingOptions.writeStdout);
        if (result && result.exitCode !== 0) {
            throw new ExecExitError(`Program returned exit code: ${result.exitCode}`, result.exitCode);
        }
    } catch (error) {
        throw error;
    }
}
