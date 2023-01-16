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
import * as packageModule from '../../../src/modules/package';

import { expect, test } from '@oclif/test';
import { mockFolders, mockRestore, userHomeDir } from '../../utils/mockfs';

import { CliUx } from '@oclif/core';
import { ProjectConfig } from '../../../src/modules/project-config';
import { velocitasConfigMock } from '../../utils/mockConfig';

const GITHUB_ORG_ENDPOINT = packageModule.GITHUB_ORG_ENDPOINT;
const GITHUB_API_URL = packageModule.GITHUB_API_URL;

describe('upgrade', () => {
    const mockedNewVersion = 'v2.0.0';

    test.do(() => {
        mockFolders(true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .nock(GITHUB_API_URL, (api) => {
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[0].version, tarball_url: 'test' },
            ]);
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[1].version, tarball_url: 'test' },
            ]);
        })
        .command(['upgrade', '--dry-run'])
        .it('checking for upgrades in dry-run - no installed sources found', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version} found`
            );
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version} found`
            );
        });

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .nock(GITHUB_API_URL, (api) => {
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[0].version, tarball_url: 'test' },
            ]);
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[1].version, tarball_url: 'test' },
            ]);
        })
        .command(['upgrade', '--dry-run'])
        .it('checking for upgrades in dry-run - up to date', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(`... '${velocitasConfigMock.packages[0].name}' is up to date!`);
            expect(ctx.stdout).to.contain(`... '${velocitasConfigMock.packages[1].name}' is up to date!`);
        });

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .nock(GITHUB_API_URL, (api) => {
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/tags`).reply(200, [
                { name: mockedNewVersion, tarball_url: 'test' },
            ]);
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/tags`).reply(200, [
                { name: mockedNewVersion, tarball_url: 'test' },
            ]);
        })
        .command(['upgrade', '--dry-run'])
        .it('checking for upgrades in dry-run - can be updated', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[0].name}' is currently at ${velocitasConfigMock.packages[0].version}, can be updated to ${mockedNewVersion}`
            );
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[1].name}' is currently at ${velocitasConfigMock.packages[1].version}, can be updated to ${mockedNewVersion}`
            );
        });

    test.do(() => {
        mockFolders(true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .nock(GITHUB_API_URL, (api) => {
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[0].version, tarball_url: 'test' },
            ]);
            api.get(
                `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/zipball/refs/tags/${velocitasConfigMock.packages[0].version}`
            ).reply(200, [{ name: velocitasConfigMock.packages[0].version, tarball_url: 'test' }]);
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[1].version, tarball_url: 'test' },
            ]);
            api.get(
                `${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/zipball/refs/tags/${velocitasConfigMock.packages[1].version}`
            ).reply(200, [{ name: velocitasConfigMock.packages[1].version, tarball_url: 'test' }]);
        })
        .stub(CliUx.ux, 'prompt', () => async () => 'y')
        .command(['upgrade'])
        .it('checking for upgrades - no installed sources found - download', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version} found`
            );
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version} found`
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
        .stderr()
        .stdout()
        .nock(GITHUB_API_URL, (api) => {
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[0].version, tarball_url: 'test' },
            ]);
        })
        .stub(CliUx.ux, 'prompt', () => async () => 'y')
        .stub(packageModule, 'downloadPackageVersion', () => {
            throw new Error('Error in downloading package');
        })
        .command(['upgrade'])
        .catch(`Error during upgrade: 'Error: Error in downloading package'`)
        .it('catches error during upgrade', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version} found`
            );
        });

    test.do(() => {
        mockFolders(true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .nock(GITHUB_API_URL, (api) => {
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[0].version, tarball_url: 'test' },
            ]);
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[1].version, tarball_url: 'test' },
            ]);
        })
        .stub(CliUx.ux, 'prompt', () => async () => 'n')
        .command(['upgrade'])
        .it('checking for upgrades - no installed sources found - do nothing', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[0].name}:${velocitasConfigMock.packages[0].version} found`
            );
            expect(ctx.stdout).to.contain(
                `... No installed sources for ${velocitasConfigMock.packages[1].name}:${velocitasConfigMock.packages[1].version} found`
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}`)).to.be.false;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].name}`)).to.be.false;
        });

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .nock(GITHUB_API_URL, (api) => {
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[0].version, tarball_url: 'test' },
            ]);
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/tags`).reply(200, [
                { name: velocitasConfigMock.packages[1].version, tarball_url: 'test' },
            ]);
        })
        .command(['upgrade'])
        .it('checking for upgrades - up to date', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(`... '${velocitasConfigMock.packages[0].name}' is up to date!`);
            expect(ctx.stdout).to.contain(`... '${velocitasConfigMock.packages[1].name}' is up to date!`);
        });

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .nock(GITHUB_API_URL, (api) => {
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/tags`).reply(200, [
                { name: mockedNewVersion, tarball_url: 'test' },
            ]);
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/zipball/refs/tags/${mockedNewVersion}`).reply(200, [
                { name: mockedNewVersion, tarball_url: 'test' },
            ]);
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/tags`).reply(200, [
                { name: mockedNewVersion, tarball_url: 'test' },
            ]);
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/zipball/refs/tags/${mockedNewVersion}`).reply(200, [
                { name: mockedNewVersion, tarball_url: 'test' },
            ]);
        })
        .stub(CliUx.ux, 'prompt', () => async () => 'y')
        .command(['upgrade'])
        .it('checking for upgrades - can be updated - download', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[0].name}' is currently at ${velocitasConfigMock.packages[0].version}, can be updated to ${mockedNewVersion}`
            );
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[1].name}' is currently at ${velocitasConfigMock.packages[1].version}, can be updated to ${mockedNewVersion}`
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].name}`)).to.be.true;
            const newVelocitasConfig: ProjectConfig = JSON.parse(
                fs.readFileSync(`${process.cwd()}/.velocitas.json`, { encoding: 'utf8', flag: 'r' })
            );
            expect(newVelocitasConfig.packages[0].version).to.be.equal(mockedNewVersion);
            expect(newVelocitasConfig.packages[1].version).to.be.equal(mockedNewVersion);
        });

    test.do(() => {
        mockFolders(true, true);
    })
        .finally(() => {
            mockRestore();
        })
        .stdout()
        .nock(GITHUB_API_URL, (api) => {
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[0].name}/tags`).reply(200, [
                { name: mockedNewVersion, tarball_url: 'test' },
            ]);
            api.get(`${GITHUB_ORG_ENDPOINT}/${velocitasConfigMock.packages[1].name}/tags`).reply(200, [
                { name: mockedNewVersion, tarball_url: 'test' },
            ]);
        })
        .stub(CliUx.ux, 'prompt', () => async () => 'n')
        .command(['upgrade'])
        .it('checking for upgrades - can be updated - do nothing', (ctx) => {
            expect(ctx.stdout).to.contain('Checking for updates!');
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[0].name}' is currently at ${velocitasConfigMock.packages[0].version}, can be updated to ${mockedNewVersion}`
            );
            expect(ctx.stdout).to.contain(
                `... '${velocitasConfigMock.packages[1].name}' is currently at ${velocitasConfigMock.packages[1].version}, can be updated to ${mockedNewVersion}`
            );
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[0].name}`)).to.be.true;
            expect(fs.existsSync(`${userHomeDir}/.velocitas/packages/${velocitasConfigMock.packages[1].name}`)).to.be.true;
        });
});
