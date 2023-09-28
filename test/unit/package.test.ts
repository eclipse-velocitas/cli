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

import 'mocha';
import mockfs from 'mock-fs';
import { PackageConfig } from '../../src/modules/package';
import { expect } from 'chai';

describe('package - module', () => {
    let envCache: any;
    before(() => {
        envCache = process.env;
        let folderPath = '/my/custom/path/.velocitas/projects/16ecd5f381f8ddafb40ec903bdd251de/packages';
        const mockfsConf: any = {};
        mockfsConf[folderPath] = {
            TestPackage: {
                'manifest.json': '{}',
            },
        };
        mockfs(mockfsConf, { createCwd: false });
    });
    describe('Package manifest', () => {
        it('should be loaded from VELOCITAS_HOME', () => {
            const packageConfig = new PackageConfig({ name: 'TestPackage', version: 'v1.2.3' });

            process.env = { VELOCITAS_HOME: '/my/custom/path' };

            packageConfig.readPackageManifest();
        });
    });
    describe('Package config', () => {
        it('should get package name', () => {
            const packageNamePlain = 'TestPackage';
            const packageConfigPlan = new PackageConfig({ name: packageNamePlain, version: 'v1.2.3' });
            const packageNameHttps = 'https://testserver.com/TestOrg/TestPackage.git';
            const packageConfigHttps = new PackageConfig({ name: packageNameHttps, version: 'v1.2.3' });
            const packageNameHttp = 'http://testserver.com/TestOrg/TestPackage.git';
            const packageConfigHttp = new PackageConfig({ name: packageNameHttp, version: 'v1.2.3' });
            const packageNameSsh = 'ssh://testuser@testserver.com:TestOrg/TestPackage.git';
            const packageConfigSsh = new PackageConfig({ name: packageNameSsh, version: 'v1.2.3' });
            const packageNameSshAlternate = 'testuser@testserver.com:TestOrg/TestPackage.git';
            const packageConfigSshAlternate = new PackageConfig({ name: packageNameSshAlternate, version: 'v1.2.3' });

            expect(packageConfigPlan.getPackageName()).equals(packageNamePlain);
            expect(packageConfigHttps.getPackageName()).equals(packageNamePlain);
            expect(packageConfigHttp.getPackageName()).equals(packageNamePlain);
            expect(packageConfigSsh.getPackageName()).equals(packageNamePlain);
            expect(packageConfigSshAlternate.getPackageName()).equals(packageNamePlain);
        });
    });
    after(() => {
        process.env = envCache;
        mockfs.restore();
    });
});
