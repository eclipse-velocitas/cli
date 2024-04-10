// Copyright (c) 2024 Contributors to the Eclipse Foundation
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
import { mockFolders } from '../../utils/mockfs';

describe('component list', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .command('component list')
        .it('lists all used components', (ctx) => {
            const expected = `- id: 'test-runtime-local'
  providedBy: test-runtime
- id: 'test-runtime-deploy-local'
  providedBy: test-runtime
- id: 'github-workflows'
  providedBy: test-setup
- id: 'core-test'
  description: 'Velocitas VApp written in Python'
  providedBy: test-package-main
- id: 'test-extension-mandatory'
  description: 'Mandatory extension for tests'
  providedBy: test-package-main
`;
            expect(ctx.stdout).to.equal(expected);
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .command(['component list', '-u'])
        .it('lists unused components from all available packages', (ctx) => {
            const expected = `- id: 'unused-component'
  providedBy: test-package-main
`;
            expect(ctx.stdout).to.equal(expected);
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true, velocitasConfigLock: true, installedComponents: true });
    })
        .stdout()
        .command(['component list', '-a'])
        .it('lists components from all available packages', (ctx) => {
            const expected = `- id: 'test-runtime-local' [used]
  providedBy: test-runtime
- id: 'test-runtime-deploy-local' [used]
  providedBy: test-runtime
- id: 'github-workflows' [used]
  providedBy: test-setup
- id: 'core-test' [used]
  description: 'Velocitas VApp written in Python'
  providedBy: test-package-main
- id: 'unused-component'
  providedBy: test-package-main
- id: 'test-extension-mandatory' [used]
  description: 'Mandatory extension for tests'
  providedBy: test-package-main
`;
            expect(ctx.stdout).to.equal(expected);
        });
});
