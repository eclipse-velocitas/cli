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

import { ChildProcess, SpawnOptions, spawn } from 'node:child_process';
import { ExecSpec, RuntimeComponent } from './component';
import { PackageConfig, ProjectConfig } from './project-config';

import { AppManifest } from './app-manifest';
import { VariableCollection } from './variables';
import { cwd } from 'node:process';
import { getPackageDirectory } from './package';
import { join } from 'node:path';

enum ProcessState {
    terminated,
    running,
    ready,
}

export type RuntimeArgs = { alias: string; [name: string]: any };

export type RuntimeFlags = {
    detach?: boolean;
    verbose?: boolean;
} & {
    [flag: string]: any;
} & {
    json: boolean | undefined;
};

class ProcessInfo {
    id: string;
    state: ProcessState = ProcessState.running;
    exitCode: number | null = null;
    process: ChildProcess;

    public constructor(id: string, process: ChildProcess) {
        this.id = id;
        this.process = process;
    }

    public isReady(): boolean {
        return this.state === ProcessState.ready;
    }

    public isTerminated(): boolean {
        return this.state === ProcessState.terminated;
    }

    public wasSuccessful(): boolean {
        if (!this.isTerminated()) {
            throw Error('Process is not yet terminated!');
        }

        return this.exitCode === 0;
    }
}

export function createEnvVars(appManifestData: AppManifest, variables: VariableCollection): NodeJS.ProcessEnv {
    const envVars = Object.assign({}, process.env, {
        VELOCITAS_WORKSPACE_DIR: cwd(),
        VELOCITAS_APP_MANIFEST: JSON.stringify(appManifestData),
    });

    for (const service of appManifestData.dependencies.services) {
        Object.assign(envVars, {
            [`${service.name.toUpperCase()}_IMAGE`]: service.image,
            [`${service.name.toUpperCase()}_TAG`]: service.version,
        });
    }

    for (const service of appManifestData.dependencies.runtime) {
        Object.assign(envVars, {
            [`${service.name.toUpperCase()}_IMAGE`]: service.image,
            [`${service.name.toUpperCase()}_TAG`]: service.version,
        });
    }

    if (variables) {
        Object.assign(envVars, variables.asEnvVars());
    }

    return envVars;
}

function delay(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export type RuntimeSpawnOptions = {
    config: ProjectConfig;
    componentConfig: PackageConfig;
    runtime: RuntimeComponent;
    envVars: NodeJS.ProcessEnv;
    key: string;
    runtimeFlags?: RuntimeFlags;
};

export async function spawnProcessesInOrder(options: RuntimeSpawnOptions) {
    if (!options.runtimeFlags?.verbose) {
        console.log = () => {};
    }
    let spawnedProcesses = new Map<string, ProcessInfo>();

    const runtimeVersion = options.config.packages.find((c) => c.name === options.componentConfig.name)?.version;
    const spawnOptions: SpawnOptions = {
        env: options.envVars,
        detached: true,
    };

    let scriptFlag: string = '';
    if (options.runtimeFlags?.detach) {
        spawnOptions.stdio = 'ignore';
        scriptFlag = '-d';
    }

    let terminateStartup = false;
    const programList = options.runtime[options.key as keyof RuntimeComponent] as Array<ExecSpec>;
    while (programList.length > 0 && !terminateStartup) {
        const execSpec = programList.shift()!;

        if (execSpec.dependsOn !== undefined) {
            const dependentProcess = spawnedProcesses.get(execSpec.dependsOn);
            if (dependentProcess === undefined || (!dependentProcess.isTerminated() && !dependentProcess.isReady())) {
                console.info(`Cannot start ${execSpec.id} b/c ${execSpec.dependsOn} is not yet ready!`);
                options.runtime.start.push(execSpec);
                // give the dependent process some time to start up
                await delay(500);
                continue;
            }

            if (dependentProcess.isTerminated() && !dependentProcess.wasSuccessful()) {
                console.error(`Cannot start ${execSpec.id} b/c ${execSpec.dependsOn} is not yet running!`);
                return;
            }

            console.log(`Dependent process ${dependentProcess.id} reports ${dependentProcess.exitCode}`);
        }

        console.info(`Starting ${execSpec.id}`);

        const programSpec = options.runtime.programs.find((prog) => prog.id === execSpec.id);
        if (!programSpec) {
            throw new Error(`No program found for item '${execSpec.id}' referenced in execution list '${options.key}'`);
        }

        const runtimeProcess = spawn(
            join(getPackageDirectory(options.componentConfig.name), runtimeVersion!, programSpec.executable),
            [scriptFlag],
            spawnOptions
        );

        let processInfo = new ProcessInfo(execSpec.id, runtimeProcess);

        spawnedProcesses.set(execSpec.id, processInfo);

        if (!options.runtimeFlags?.detach) {
            const lineCapturer = (isError: boolean, data: any) => {
                for (let line of data.toString().split('\n')) {
                    let lineTrimmed = (line as string).trim();

                    if (lineTrimmed.length === 0) {
                        continue;
                    }

                    if (execSpec.startupLine !== undefined) {
                        const regex = new RegExp(execSpec.startupLine);
                        const result = regex.exec(lineTrimmed);
                        console.log(`Trying to match startup line: '${execSpec.startupLine}' vs '${lineTrimmed}'`);
                        if (result && result.length > 0) {
                            console.log(`${execSpec.id} Startup line found, process assumed to be running fine`);
                            processInfo.state = ProcessState.ready;
                        }
                    }
                    if (isError) {
                        console.error(`${execSpec.id}, ${lineTrimmed}`);
                    }
                }
            };

            runtimeProcess.stdout!.on('data', (data) => lineCapturer(false, data));
            runtimeProcess.stderr!.on('data', (data) => lineCapturer(true, data));
            process.on('SIGINT', async () => {
                terminateStartup = true;
                if (options.key === 'start') {
                    options.key = 'stop';
                    await spawnProcessesInOrder(options);
                }
            });
        }
        runtimeProcess.on('close', (code) => {
            processInfo.exitCode = code;
            processInfo.state = ProcessState.terminated;
            console.log(`${execSpec.id} process exited with code ${code}`);
        });
    }
}
