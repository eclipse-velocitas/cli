// Copyright (c) 2023-2025 Contributors to the Eclipse Foundation
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
import { resolve } from 'node:path';
import { ExecSpec, ProgramSpec } from './component';
import { ProjectCache } from './project-cache';
import { ProjectConfig } from './projectConfig/projectConfig';
import { stdOutParser } from './stdout-parser';

const lineCapturer = (projectCache: ProjectCache, writeStdout: boolean, data: string) => {
    if (writeStdout) {
        process.stdout.write(data);
    }
    data.toString()
        .split('\n')
        .forEach((value) => stdOutParser(projectCache, value));
};

export function setSpawnImplementation(func: (command: string, args: string | string[], options: any) => IPty) {
    ptySpawn = func;
}

let ptySpawn = (command: string, args: string | string[], options: any): IPty => spawn(command, args, options);

export async function awaitSpawn(
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    writeStdout: boolean,
    interactive: boolean = false,
): Promise<{ exitCode: number; signal?: number } | null> {
    const projectCache = ProjectCache.read();

    const ptyProcess = ptySpawn(command, args, {
        cwd: cwd,
        env: env as any,
    });

    ptyProcess.onData((data) => lineCapturer(projectCache, writeStdout, data));

    if (interactive) {
        process.stdin.setRawMode(true);
    }

    process.stdin.on('data', ptyProcess.write.bind(ptyProcess));

    return new Promise((resolveFunc) => {
        // Needed to kill all childprocesses inside the spawned tty to avoid having leftovers
        const sigintCallback = () => {
            const spawnedTtyId = (ptyProcess as any)._pty.split('/dev/')[1];
            exec(`pkill -t ${spawnedTtyId}`);
        };
        process.on('SIGINT', sigintCallback);
        ptyProcess.onExit((code) => {
            if (interactive) {
                process.stdin.setRawMode(false);
            }
            process.stdin.pause();
            ptyProcess.kill();
            resolveFunc(code);
            projectCache.write();
            process.removeListener('SIGINT', sigintCallback);
            process.stdin.removeAllListeners('data');
        });
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

    const cwd = componentContext.getComponentPath();

    let programArgs = programSpec.args ? programSpec.args : [];
    if (execSpec.args && execSpec.args.length > 0) {
        programArgs = programArgs.concat(execSpec.args);
    }

    try {
        let command = programSpec.executable.includes('/') ? resolve(cwd, programSpec.executable) : programSpec.executable;
        if (isPython(command)) {
            command = await createPythonVenv(componentId, command, envVars, cwd, loggingOptions);
        }

        const result = await awaitSpawn(command, programArgs, cwd, envVars, loggingOptions.writeStdout, programSpec.interactive);
        if (result && result.exitCode !== 0) {
            throw new ExecExitError(`Program returned exit code: ${result.exitCode}`, result.exitCode);
        }
    } catch (error) {
        throw error;
    }
}

function isPython(command: string): boolean {
    return ['pip', 'pip3', 'python', 'python3'].includes(command);
}

async function createPythonVenv(
    componentId: string,
    command: string,
    envVars: NodeJS.ProcessEnv,
    cwd: string,
    loggingOptions: { writeStdout?: boolean; verbose?: boolean },
) {
    const venvDir = `${ProjectCache.getCacheDir()}/pyvenv/${componentId}`;
    let venvCreateCmd = command;
    if (command === 'pip') {
        venvCreateCmd = 'python';
    } else if (command === 'pip3') {
        venvCreateCmd = 'python3';
    }

    if (loggingOptions.writeStdout === undefined) {
        loggingOptions.writeStdout = true;
    }

    const result = await awaitSpawn(venvCreateCmd, ['-m', 'venv', venvDir], cwd, envVars, loggingOptions.writeStdout);
    if (result && result.exitCode !== 0) {
        throw new ExecExitError(`Failed creating Python venv: ${result.exitCode}`, result.exitCode);
    }
    return `${venvDir}/bin/${command}`;
}
