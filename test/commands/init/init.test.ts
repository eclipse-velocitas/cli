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

import * as fs from 'fs';

import { GITHUB_API_URL, GITHUB_ORG_ENDPOINT } from '../../../src/modules/package';
import { expect, test } from '@oclif/test';
import { mockFolders, mockRestore, userHomeDir } from '../../utils/mockfs';

import { velocitasConfigMock } from '../../utils/mockConfig';

describe('init', () => {
    test.do(() => {
        mockFolders(true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .nock(GITHUB_API_URL, (api) => {
            api.get(
                `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/zipball/refs/tags/${velocitasConfigMock.packages[0].version}`
            ).reply(200, [{ name: velocitasConfigMock.packages[0].version, tarball_url: 'test' }]);
            api.get(
                `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/zipball/refs/tags/${velocitasConfigMock.packages[0].version}`
            ).reply(200, [{ name: velocitasConfigMock.packages[1].version, tarball_url: 'test' }]);
        })
        .command(['init'])
        .it('downloads components from preconfigured velocitas.json', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas components ...');
            expect(ctx.stdout).to.contain(
                `... Downloading component: '${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version}'`
            );
            expect(ctx.stdout).to.contain(
                `... Downloading component: '${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version}'`
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].name}`)).to.be.true;
        });

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['init'])
        .it('skips downloading because component is already installed', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas components ...');
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version}' already initialized.`
            );
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version}' already initialized.`
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].name}`)).to.be.true;
        });

    test.do(() => {
        mockFolders();
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .command(['init'])
        .it('creates config file from default velocitas.json', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas components ...');
            expect(ctx.stdout).to.contain('... Creating .velocitas.json at the root of your repository.');
            expect(fs.existsSync(`${process.cwd()}/.velocitas.json`)).to.be.true;
        });
});
