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

import 'mocha';
import { AppManifest } from '../../src/modules/app-manifest';
import { expect } from 'chai';
import { CliFileSystem, MockFileSystem, MockFileSystemObj } from '../../src/utils/fs-bridge';

describe('app-manifest - module', () => {
    before(() => {
        const mockFilesystem: MockFileSystemObj = {
            '/AppManifestInvalid.json': 'foo',
            '/AppManifestValid.json': '{ "name": "AppName", "manifestVersion": "v3" }',
            '/AppManifestArray.json': '[ { "name": "AppName", "manifestVersion": "v3" } ]',
        };
        CliFileSystem.setImpl(new MockFileSystem(mockFilesystem));
    });
    describe('AppManifest reading', () => {
        it('should silently continue if the file does not exist.', () => {
            expect(AppManifest.read.bind(AppManifest.read, '/AppManifest2.json')).to.not.throw();
        });

        it('should throw an error if file is present, but cannot be read.', () => {
            expect(AppManifest.read.bind(AppManifest.read, '/AppManifestInvalid.json')).to.throw();
        });

        it('should read the file and return proper content', () => {
            const appManifest = AppManifest.read('/AppManifestValid.json');

            expect(appManifest!['name']).to.be.eq('AppName');
            expect(appManifest!['manifestVersion']).to.be.eq('v3');
        });

        it('should omit the root array, if it exists and return proper content', () => {
            const appManifest = AppManifest.read('/AppManifestArray.json');

            expect(appManifest!['name']).to.be.eq('AppName');
            expect(appManifest!['manifestVersion']).to.be.eq('v3');
        });
    });
});
