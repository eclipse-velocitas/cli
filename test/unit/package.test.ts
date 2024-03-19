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

import 'mocha';
import { PackageConfig } from '../../src/modules/package';
import { expect } from 'chai';
import { CliFileSystem, MockFileSystem, MockFileSystemObj } from '../../src/utils/fs-bridge';

describe('package - module', () => {
    let envCache: any;
    before(() => {
        envCache = process.env;
        const testpackage = '/my/custom/path/.velocitas/packages/TestPackage/v1.2.3/manifest.json';

        let mockFilesystem: MockFileSystemObj = {
            [testpackage]: '{}',
        };
        CliFileSystem.setImpl(new MockFileSystem(mockFilesystem));
    });
    describe('Package manifest', () => {
        it('should be loaded from VELOCITAS_HOME', () => {
            const packageConfig = new PackageConfig({ repo: 'TestPackage', version: 'v1.2.3' });

            process.env = { VELOCITAS_HOME: '/my/custom/path' };

            packageConfig.readPackageManifest();
        });
    });
    describe('Package config', () => {
        it('should get package name', () => {
            const packageNamePlain = 'TestPackage';
            const packageConfigPlan = new PackageConfig({ repo: packageNamePlain, version: 'v1.2.3' });
            const packageNameHttps = 'https://testserver.com/TestOrg/TestPackage.git';
            const packageConfigHttps = new PackageConfig({ repo: packageNameHttps, version: 'v1.2.3' });
            const packageNameHttp = 'http://testserver.com/TestOrg/TestPackage.git';
            const packageConfigHttp = new PackageConfig({ repo: packageNameHttp, version: 'v1.2.3' });
            const packageNameSsh = 'ssh://testuser@testserver.com:TestOrg/TestPackage.git';
            const packageConfigSsh = new PackageConfig({ repo: packageNameSsh, version: 'v1.2.3' });
            const packageNameSshAlternate = 'testuser@testserver.com:TestOrg/TestPackage.git';
            const packageConfigSshAlternate = new PackageConfig({ repo: packageNameSshAlternate, version: 'v1.2.3' });

            expect(packageConfigPlan.getPackageName()).equals(packageNamePlain);
            expect(packageConfigHttps.getPackageName()).equals(packageNamePlain);
            expect(packageConfigHttp.getPackageName()).equals(packageNamePlain);
            expect(packageConfigSsh.getPackageName()).equals(packageNamePlain);
            expect(packageConfigSshAlternate.getPackageName()).equals(packageNamePlain);
        });
    });
    after(() => {
        process.env = envCache;
    });
});
