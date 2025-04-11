// Copyright (c) 2024-2025 Contributors to the Eclipse Foundation
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
import { ProjectConfigIO } from '../../../src/modules/projectConfig/projectConfigIO';
import { mockFolders } from '../../utils/mockfs';

describe('component add', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .command(['component add', 'unused-component'])
        .it('adds an unused component', (ctx) => {
            expect(
                ProjectConfigIO.read('')
                    .getComponentContexts()
                    .map((componentCtx) => componentCtx.manifest.id),
            ).to.contain('unused-component');
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .command(['component add', 'test-runtime-local'])
        .catch((error) => {
            expect(error.message).to.eq("Component 'test-runtime-local' already added to project!");
        })
        .it('throws an exception when trying to add an already added component');

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .command(['component add', 'test-runtime-local2'])
        .catch((error) => {
            expect(error.message).to.eq(
                "Component 'test-runtime-local2' does not exist in any referenced package! Did you add the correct package via 'velocitas package' command?",
            );
        })
        .it('throws an exception when trying to add a component not provided by any package');
});
