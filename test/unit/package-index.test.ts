// Copyright (c) 2023 Robert Bosch GmbH
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
import { PackageIndex } from '../../src/modules/package-index';
import { expect } from 'chai';

const validPackageIndexMock = [
    {
        type: 'extension',
        package: 'velocitas/test.git',
        exposedInterfaces: [
            {
                type: 'test-interface',
                description: 'Test interface',
                default: true,
                args: [
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
        type: 'core',
        package: 'vehicle-app-test-sdk',
        exposedInterfaces: [
            {
                type: 'examples',
                description: 'Provided test examples from test SDK',
                args: [
                    {
                        id: 'test-example',
                        description: 'Test Example',
                        type: 'string',
                        default: '',
                        required: false,
                    },
                ],
            },
        ],
    },
];

const invalidPackageIndexMock = [
    {
        type: 'extension',
        package: 'invalidPackageURI',
        exposedInterfaces: [
            {
                type: 'test-interface',
                description: 'Test interface',
                default: true,
                args: [
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
        type: 'core',
        package: 'invalidSdk',
        exposedInterfaces: [
            {
                type: 'examples',
                description: 'Provided test examples from test SDK',
                args: [
                    {
                        id: 'test-example',
                        description: 'Test Example',
                        type: 'string',
                        default: '',
                        required: false,
                    },
                ],
            },
        ],
    },
];
const EXPECTED_AVAILABLE_LANGUAGES = ['test'];
const EXPECTED_AVAILABLE_EXAMPLES = [{ name: 'Test Example', value: 'test-example', language: 'test' }];
const EXPECTED_AVAILABLE_PACKAGES = [{ name: 'test', checked: true }];
const EXPECTED_AVAILABLE_INTERFACES = [
    {
        name: 'Test interface',
        value: 'test-interface',
        args: [
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
        default: true,
    },
];

describe('package-index - module', () => {
    before(() => {
        const mockfsConf: any = {
            'package-index.json': JSON.stringify(validPackageIndexMock),
            'invalidPackage-index.json': JSON.stringify(invalidPackageIndexMock),
        };
        mockfs(mockfsConf, { createCwd: true });
    });
    describe('Package Index', () => {
        it('should be able to read the package-index.json on root path.', () => {
            expect(() => PackageIndex.read()).to.not.throw();
        });
        it('should throw an error if package-index.json is not found.', () => {
            expect(() => PackageIndex.read('no-package-index.json')).to.throw();
        });
        it('should parse AVAILABLE_LANGUAGES correctly from valid package-index.json.', () => {
            const packageIndex = PackageIndex.read();
            const AVAILABLE_LANGUAGES = packageIndex.getAvailableLanguages();
            expect(AVAILABLE_LANGUAGES).to.be.deep.equal(EXPECTED_AVAILABLE_LANGUAGES);
        });
        it('should parse AVAILABLE_EXAMPLES correctly from valid package-index.json.', () => {
            const packageIndex = PackageIndex.read();
            const AVAILABLE_EXAMPLES = packageIndex.getAvailableExamples();
            expect(AVAILABLE_EXAMPLES).to.be.deep.equal(EXPECTED_AVAILABLE_EXAMPLES);
        });
        it('should parse AVAILABLE_INTERFACES correctly from valid package-index.json.', () => {
            const packageIndex = PackageIndex.read();
            const AVAILABLE_INTERFACES = packageIndex.getAvailableInterfaces();
            expect(AVAILABLE_INTERFACES).to.be.deep.equal(EXPECTED_AVAILABLE_INTERFACES);
        });
        it('should parse AVAILABLE_LANGUAGES correctly from valid invalidPackage-index.json.', () => {
            const packageIndex = PackageIndex.read('./invalidPackage-index.json');
            const AVAILABLE_LANGUAGES = packageIndex.getAvailableLanguages();
            expect(AVAILABLE_LANGUAGES).to.be.empty;
        });
        it('should parse AVAILABLE_EXAMPLES correctly from valid invalidPackage-index.json.', () => {
            const packageIndex = PackageIndex.read('./invalidPackage-index.json');
            const AVAILABLE_EXAMPLES = packageIndex.getAvailableExamples();
            expect(AVAILABLE_EXAMPLES).to.be.empty;
        });
        it('should parse AVAILABLE_INTERFACES correctly from valid invalidPackage-index.json.', () => {
            const packageIndex = PackageIndex.read('./invalidPackage-index.json');
            const AVAILABLE_INTERFACES = packageIndex.getAvailableInterfaces();
            console.log(AVAILABLE_INTERFACES);
            expect(AVAILABLE_INTERFACES).to.be.empty;
        });
    });
    after(() => {
        mockfs.restore();
    });
});
