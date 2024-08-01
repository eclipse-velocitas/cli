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

import { expect, test } from '@oclif/test';
import { getVelocitasRoot } from '../../../src/modules/package';
import { getCacheData } from '../../helpers/cache';
import { mockFolders } from '../../utils/mockfs';

describe('cache', () => {
    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .stdout()
        .command('cache get')
        .it('returns the entire cache content', (ctx) => {
            expect(ctx.stdout).to.equal('{"myField":"myValue"}\n');
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .stdout()
        .command(['cache get', 'myField'])
        .it('returns the value of a single cache key', (ctx) => {
            expect(ctx.stdout).to.equal('myValue\n');
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .stdout()
        .command(['cache get', '--path'])
        .it('prints the cache path', (ctx) => {
            expect(ctx.stdout.trim().startsWith(`${getVelocitasRoot()}/projects`)).to.be.true;
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .stdout()
        .command(['cache set', 'foo', 'bar'])
        .it('sets a cache field', (ctx) => {
            expect(getCacheData()).to.deep.eq({ myField: 'myValue', foo: 'bar' });
        });

    test.do(() => {
        mockFolders({ velocitasConfig: true });
    })
        .stdout()
        .command('cache clear')
        .it('clears all cache contents', (ctx) => {
            expect(getCacheData()).to.deep.eq({});
        });
});
