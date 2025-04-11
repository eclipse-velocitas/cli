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

describe('component remove', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .command(['component remove', 'test-runtime-local'])
        .it('removes a used component', (ctx) => {
            expect(
                ProjectConfigIO.read('')
                    .getComponentContexts()
                    .map((componentCtx) => componentCtx.manifest.id),
            ).to.not.contain('test-runtime-local');
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .command(['component remove', 'test-runtime-local2'])
        .catch((error) => {
            expect(error.message).to.eq(
                "Component 'test-runtime-local2' does not exist in any referenced package! Did you add the correct package via 'velocitas package' command?",
            );
        })
        .it('throws an exception when trying to remove an unkown component');

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .command(['component remove', 'unused-component'])
        .catch((error) => {
            expect(error.message).to.eq("Component 'unused-component' is not part of the project!");
        })
        .it('throws an exception when trying to remove an unused component');
});
