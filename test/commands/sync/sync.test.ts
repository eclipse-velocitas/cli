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

import { expect, test } from '@oclif/test';
import { runtimeComponentManifestMock, setupComponentManifestMock, velocitasConfigMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore } from '../../utils/mockfs';

describe('sync', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true, installedComponents: true });
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['sync'])
        .it('syncing components into project directory', (ctx) => {
            expect(ctx.stdout).to.contain('Syncing Velocitas components!');
            expect(ctx.stdout).to.contain(`... syncing '${setupComponentManifestMock.components[0].id}'`);
            expect(ctx.stdout).to.not.contain(`... syncing '${runtimeComponentManifestMock.components[0].id}'`);
        });
});
