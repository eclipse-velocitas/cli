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
import { runtimePackageManifestMock, setupPackageManifestMock } from '../../utils/mockConfig';
import { mockFolders } from '../../utils/mockfs';

describe('sync', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .command(['sync'])
        .it('syncing components into project directory', (ctx) => {
            expect(ctx.stdout).to.contain('Syncing Velocitas components!');
            expect(ctx.stdout).to.contain(`... syncing '${setupPackageManifestMock.components[0].id}'`);
            expect(ctx.stdout).to.not.contain(`... syncing '${runtimePackageManifestMock.components[0].id}'`);
        });
});
