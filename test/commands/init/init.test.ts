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
import archiver from 'archiver';
import * as fs from 'fs';
import { Component } from '../../../src/modules/component';
import { GITHUB_API_URL, GITHUB_ORG_ENDPOINT, MANIFEST_FILE_NAME, PackageManifest } from '../../../src/modules/package';
import { runtimeComponentManifestMock, velocitasConfigMock } from '../../utils/mockConfig';
import { mockFolders, mockRestore, userHomeDir } from '../../utils/mockfs';

const GITHUB_API_TOKEN = 'MY_API_TOKEN';
const HEADER_AUTHORIZATION = 'authorization';

function createPackageArchive(components = new Array<Component>()) {
    let archive = archiver('zip');
    const packageManifest: PackageManifest = {
        components: components,
    };
    archive.append(JSON.stringify(packageManifest), { name: MANIFEST_FILE_NAME });
    archive.finalize();

    return archive;
}

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
            ).reply(404);

            api.get(
                `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/zipball/refs/tags/${velocitasConfigMock.packages[1].version}`
            ).reply(200, createPackageArchive());

            api.get(
                `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/zipball/${velocitasConfigMock.packages[0].version}`
            ).reply(200, createPackageArchive());
        })
        .command(['init', '-v'])
        .it('retries downloading package from fallback url', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(
                `... Downloading package: '${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version}'`
            );
            expect(ctx.stdout).to.contain(
                `Did not find tag '${velocitasConfigMock.packages[0].version}' in '${velocitasConfigMock.packages[0].name}' - looking for branch ...`
            );
            expect(ctx.stdout).to.contain(
                `Succesfully downloaded package: '${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version}'`
            );
            expect(ctx.stdout).to.contain(
                `... Downloading package: '${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version}'`
            );
            expect(ctx.stdout).to.contain(
                `Succesfully downloaded package: '${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version}'`
            );

            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].name}`)).to.be.true;
        });

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
            ).reply(200, createPackageArchive());
            api.get(
                `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/zipball/refs/tags/${velocitasConfigMock.packages[0].version}`
            ).reply(200, createPackageArchive());
        })
        .command(['init'])
        .it('downloads packages from preconfigured velocitas.json', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(
                `... Downloading package: '${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version}'`
            );
            expect(ctx.stdout).to.contain(
                `... Downloading package: '${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version}'`
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
        .command(['init', '-v'])
        .it('skips downloading because package is already installed', (ctx) => {
            console.error(ctx.stdout);
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
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
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain('... Creating .velocitas.json at the root of your repository.');
            expect(fs.existsSync(`${process.cwd()}/.velocitas.json`)).to.be.true;
        });

    test.do(() => {
        mockFolders(true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .env({ GITHUB_API_TOKEN: GITHUB_API_TOKEN })
        .nock(GITHUB_API_URL, (api) => {
            api.matchHeader(HEADER_AUTHORIZATION, `Bearer ${GITHUB_API_TOKEN}`)
                .get(
                    `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/zipball/refs/tags/${velocitasConfigMock.packages[0].version}`
                )
                .reply(200, createPackageArchive());
            api.matchHeader(HEADER_AUTHORIZATION, `Bearer ${GITHUB_API_TOKEN}`)
                .get(
                    `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/zipball/refs/tags/${velocitasConfigMock.packages[0].version}`
                )
                .reply(200, createPackageArchive());
        })
        .command(['init'])
        .it('uses API token, if provided, to download packages', (ctx) => {
            expect(ctx.stdout).to.contain('Initializing Velocitas packages ...');
            expect(ctx.stdout).to.contain(
                `... Downloading package: '${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version}'`
            );
            expect(ctx.stdout).to.contain(
                `... Downloading package: '${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version}'`
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].name}`)).to.be.true;
        });

    test.do(() => {
        mockFolders(true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .env({ GITHUB_API_TOKEN: GITHUB_API_TOKEN })
        .nock(GITHUB_API_URL, (api) => {
            api.matchHeader(HEADER_AUTHORIZATION, `Bearer ${GITHUB_API_TOKEN}`)
                .get(
                    `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/zipball/refs/tags/${velocitasConfigMock.packages[0].version}`
                )
                .reply(200, createPackageArchive());
            api.matchHeader(HEADER_AUTHORIZATION, `Bearer ${GITHUB_API_TOKEN}`)
                .get(
                    `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/zipball/refs/tags/${velocitasConfigMock.packages[0].version}`
                )
                .reply(200, createPackageArchive(runtimeComponentManifestMock.components));
        })
        .command(['init'])
        .it('runs post-init hooks', (ctx) => {
            expect(ctx.stdout).to.contain(`... > Running post init hook for test-runtime-local`);
        });
});
