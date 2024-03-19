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

import { expect } from 'chai';
import 'mocha';
import { cwd } from 'node:process';
import { CoreComponent, ExtensionComponent, PackageAttributes, PackageIndex, Parameter } from '../../src/modules/package-index';
import { CliFileSystem, MockFileSystem, MockFileSystemObj } from '../../src/utils/fs-bridge';

const validPackageIndexMock: PackageAttributes[] = [
    {
        package: 'velocitas/test.git',
        components: [
            {
                id: 'test-extension',
                type: 'extension',
                name: 'Test Extension',
                description: 'Test Extension',
                mandatory: true,
                compatibleCores: ['core-test'],
                parameters: [
                    {
                        id: 'test-arg-required',
                        description: 'Test config for required arg',
                        default: 'test-arg-required',
                        required: true,
                        type: 'string',
                    },
                    {
                        id: 'test',
                        description: 'Test config for not required arg',
                        default: '{"required":[{"path":"","access":""}]}',
                        required: false,
                        type: 'object',
                    },
                ],
            } as ExtensionComponent,
        ],
    },
    {
        package: 'velocitas/test-package-main',
        components: [
            {
                id: 'core-test',
                type: 'core',
                name: 'Velocitas Vehicle App (Python)',
                description: 'Creates a Vehicle App written in Python',
                mandatory: false,
                options: [
                    {
                        id: 'from-example',
                        name: 'Create an application from an example',
                        parameters: [
                            {
                                id: 'example',
                                description: 'Provided Examples from SDK',
                                type: 'list',
                                required: true,
                                values: [
                                    {
                                        id: 'seat-adjuster',
                                        description: 'Seat Adjuster Example',
                                    },
                                    {
                                        id: 'dog-mode',
                                        description: 'Dog Mode Example',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        id: 'from-skeleton',
                        name: 'Create an application from scratch',
                        parameters: [
                            {
                                id: 'name',
                                required: true,
                                description: 'Name of your application',
                                type: 'string',
                            },
                        ],
                    },
                ],
            } as CoreComponent,
        ],
    },
];

const invalidPackageIndexMock = [
    {
        packageInvalid: 'invalidPackageURI',
        components: [
            {
                id: 'test-extension',
                type: 'invalid',
                name: 'Test Extension',
                description: 'Test Extension',
                compatibleCores: ['core-test'],
                parameters: [
                    {
                        id: 'test-arg-required',
                        description: 'Test config for required arg',
                        default: 'test-arg-required',
                        required: true,
                        type: 'string',
                    },
                    {
                        id: 'test',
                        description: 'Test config for not required arg',
                        default: '{"required":[{"path":"","access":""}]}',
                        required: false,
                        type: 'object',
                    },
                ],
            },
        ],
    },
    {
        package: 'invalidSdk',
        components: [
            {
                id: 'vehicle-app-python-invalid',
                type: 'invalid',
                name: 'Velocitas Vehicle App (Python)',
                description: 'Creates a Vehicle App written in Python',
                options: [
                    {
                        id: 'from-example',
                        name: 'Create an application from an example',
                        parameters: [
                            {
                                id: 'example',
                                description: 'Provided Examples from SDK',
                                type: 'list',
                                required: true,
                                values: [
                                    {
                                        id: 'seat-adjuster',
                                        description: 'Seat Adjuster Example',
                                    },
                                    {
                                        id: 'dog-mode',
                                        description: 'Dog Mode Example',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        id: 'from-skeleton',
                        name: 'Create an application from scratch',
                        parameters: [
                            {
                                id: 'name',
                                required: true,
                                description: 'Name of your application',
                                type: 'string',
                            },
                        ],
                    },
                ],
            },
        ],
    },
];
const EXPECTED_AVAILABLE_CORES: CoreComponent[] = validPackageIndexMock[1].components as CoreComponent[];
const EXPECTED_AVAILABLE_EXTENSIONS: ExtensionComponent[] = validPackageIndexMock[0].components as ExtensionComponent[];
const EXPECTED_AVAILABLE_EXTENSION_PARAMETER: Parameter[] = EXPECTED_AVAILABLE_EXTENSIONS[0].parameters!;
const EXPECTED_AVAILABLE_PACKAGES = [validPackageIndexMock[0]];
const EXPECTED_MANDATORY_EXTENSION_IDS: string[] = ['test-extension'];

describe('package-index - module', () => {
    before(() => {
        const validPackageIndexPath = `${cwd()}/package-index.json`;
        const invalidPackageIndexPath = `${cwd()}/invalidPackage-index.json`;

        const mockFilesystem: MockFileSystemObj = {
            [validPackageIndexPath]: JSON.stringify(validPackageIndexMock),
            [invalidPackageIndexPath]: JSON.stringify(invalidPackageIndexMock),
        };
        CliFileSystem.setImpl(new MockFileSystem(mockFilesystem));
    });
    describe('Package Index', () => {
        it('should be able to read the package-index.json on root path.', () => {
            expect(() => PackageIndex.read()).to.not.throw();
        });
        it('should throw an error if package-index.json is not found.', () => {
            expect(() => PackageIndex.read('no-package-index.json')).to.throw();
        });
        it('should parse available cores correctly from valid package-index.json.', () => {
            const packageIndex = PackageIndex.read();
            const availableCores = packageIndex.getCores();
            expect(availableCores).to.be.deep.equal(EXPECTED_AVAILABLE_CORES);
        });
        it('should parse available extensions correctly from valid package-index.json.', () => {
            const packageIndex = PackageIndex.read();
            const availableExtensions = packageIndex.getExtensions();
            expect(availableExtensions).to.be.deep.equal(EXPECTED_AVAILABLE_EXTENSIONS);
        });
        it('should parse available mandatory extensions correctly from valid package-index.json.', () => {
            const packageIndex = PackageIndex.read();
            const mandatoryExtensionIds = packageIndex.getMandatoryExtensionsByCoreId('core-test').map((ext: ExtensionComponent) => ext.id);
            expect(mandatoryExtensionIds).to.be.deep.equal(EXPECTED_MANDATORY_EXTENSION_IDS);
        });
        it('should get correct extension parameters by parameterId.', () => {
            const packageIndex = PackageIndex.read();
            const extensionParameters = packageIndex.getExtensionParametersByParameterId('test-extension');
            expect(extensionParameters).to.be.deep.equal(EXPECTED_AVAILABLE_EXTENSION_PARAMETER);
        });
        it('should parse available cores correctly from valid invalidPackage-index.json.', () => {
            const packageIndex = PackageIndex.read('./invalidPackage-index.json');
            const availableCores = packageIndex.getCores();
            expect(availableCores).to.be.empty;
        });
        it('should parse available extensions correctly from valid invalidPackage-index.json.', () => {
            const packageIndex = PackageIndex.read('./invalidPackage-index.json');
            const availableExtensions = packageIndex.getExtensions();
            expect(availableExtensions).to.be.empty;
        });
        it('should parse available mandatory extensions correctly from valid invalidPackage-index.json.', () => {
            const packageIndex = PackageIndex.read('./invalidPackage-index.json');
            const mandatoryExtensions = packageIndex.getMandatoryExtensionsByCoreId('core-test');
            expect(mandatoryExtensions).to.be.empty;
        });
    });
});
