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
import { velocitasConfigMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore, userHomeDir } from '../../utils/mockfs';

describe('package', () => {
    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['package'])
        .it('prints information about all installed packages', (ctx) => {
            expect(ctx.stdout).to.contain('version: v1.1.1');
        });

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['package', '-p', `${velocitasConfigMock.packages[0].name}`])
        .it('prints the path of specified package', (ctx) => {
            expect(ctx.stdout).to.contain(
                `${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}/${velocitasConfigMock.packages[0].version}`
            );
        });

    test.do(() => {
        mockFolders(true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['package'])
        .catch(`Cannot find component ${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version}`)
        .it('throws error when configured component cannot be found');

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['package', '-p'])
        .catch('Path can be only printed for a single package, please specify <name>!')
        .it('throws error when no package name is specified');
});
