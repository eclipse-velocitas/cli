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

import { expect, test } from '@oclif/test';
import { IEvent, IPty } from 'node-pty';
import { setSpawnImplementation } from '../../../src/modules/exec';
import { runtimeComponentManifestMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore } from '../../utils/mockfs';

type ExitType = {
    exitCode: number;
    signal?: number | undefined;
};

class StubPty implements IPty {
    pid: number;
    cols: number;
    rows: number;
    process: string;
    handleFlowControl: boolean;
    on(event: 'data', listener: (data: string) => void): void;
    on(event: 'exit', listener: (exitCode: number, signal?: number | undefined) => void): void;
    on(event: unknown, listener: unknown): void {}

    onData: IEvent<string>;
    onExit: IEvent<ExitType>;

    _pty: string;

    constructor(exitCode: number = 0) {
        this.pid = 0;
        this.cols = 80;
        this.rows = 24;
        this.process = 'stub';
        this.handleFlowControl = false;
        this.onData = (listener: (e: string) => any) => {
            return { dispose: () => {} };
        };
        this.onExit = (listener: (e: ExitType) => any) => {
            listener({ exitCode: exitCode });
            return { dispose: () => {} };
        };

        this._pty = '/dev/0';
    }

    resize(columns: number, rows: number): void {}
    clear(): void {}
    write(data: string): void {}
    kill(signal?: string | undefined): void {}
    pause(): void {}
    resume(): void {}
}

describe('exec', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true, installedPackages: true });
        setSpawnImplementation((command: string, args: string | string[], options: any) => new StubPty());
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stderr()
        .command([
            'exec',
            `${runtimeComponentManifestMock.components[0].id}`,
            `${runtimeComponentManifestMock.components[0].programs[0].id}`,
        ])
        .it('executes a runtime script', (ctx) => {
            expect(ctx.stderr).to.be.empty;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedPackages: true });
        setSpawnImplementation((command: string, args: string | string[], options: any) => new StubPty());
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stderr()
        .command([
            'exec',
            `${runtimeComponentManifestMock.components[0].id}`,
            `${runtimeComponentManifestMock.components[0].programs[0].id}`,
            '--args',
            `additionalArgument`,
            `additionalArgument2`,
        ])
        .it('executes a runtime script with additional arguments', (ctx) => {
            expect(ctx.stderr).to.be.empty;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedPackages: true });
        setSpawnImplementation((command: string, args: string | string[], options: any) => new StubPty());
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .stderr()
        .command([
            'exec',
            `${runtimeComponentManifestMock.components[1].id}`,
            `${runtimeComponentManifestMock.components[1].programs[0].id}`,
        ])
        .it('executes a deployment script', (ctx) => {
            expect(ctx.stderr).to.be.empty;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedPackages: true, appManifest: false });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command([
            'exec',
            `${runtimeComponentManifestMock.components[1].id}`,
            `${runtimeComponentManifestMock.components[1].programs[0].id}`,
        ])
        .it('should log warning when no AppManifest.json is found', (ctx) => {
            console.error(ctx.stdout);
            expect(ctx.stdout).to.contain('*** Info ***: No AppManifest found');
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedPackages: true });
        setSpawnImplementation((command: string, args: string | string[], options: any) => new StubPty());
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['exec', `${runtimeComponentManifestMock.components[0].id}`, 'unknown-script'])
        .catch(
            `No program found for item 'unknown-script' referenced in program list of '${runtimeComponentManifestMock.components[0].id}'`,
        )
        .it('throws error when program is not found in specified runtime component');

    test.do(() => {
        mockFolders({ velocitasConfig: true, installedPackages: true });
        setSpawnImplementation((command: string, args: string | string[], options: any) => new StubPty());
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['exec', `${runtimeComponentManifestMock.components[1].id}`, 'unknown-script'])
        .catch(
            `No program found for item 'unknown-script' referenced in program list of '${runtimeComponentManifestMock.components[1].id}'`,
        )
        .it('throws error when program is not found in specified deployment component');
});
