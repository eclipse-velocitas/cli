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

import { CoreComponent, ExtensionComponent, PackageAttributes } from '../../src/modules/package-index';

export const velocitasConfigMock = {
    packages: [
        {
            repo: 'test-runtime',
            version: 'v1.1.1',
            variables: { test: 'test' },
        },
        {
            repo: 'test-setup',
            version: 'v1.1.1',
        },
        {
            repo: 'test-package-main',
            version: 'v1.1.1',
        },
    ],
    variables: {
        language: 'python',
        repoType: 'app',
        appManifestPath: 'app/AppManifest.json',
        githubRepoId: 'test',
    },
};

export const packageIndexMock: PackageAttributes[] = [
    {
        package: 'https://github.com/eclipse-velocitas/test-runtime.git',
        components: [
            {
                id: 'test-extension-mandatory',
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
            {
                id: 'test-extension',
                type: 'extension',
                name: 'Test Extension',
                description: 'Test Extension',
                mandatory: false,
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
        package: 'https://github.com/eclipse-velocitas/test-package-main.git',
        components: [
            {
                id: 'core-test',
                type: 'core',
                name: 'Test Core Package',
                description: 'Test Core Package',
                mandatory: false,
                options: [
                    {
                        id: 'from-example',
                        name: 'Create an application from an example',
                        parameters: [
                            {
                                id: 'example',
                                description: 'Test Example',
                                type: 'string',
                                required: true,
                                values: [
                                    {
                                        id: 'test-example',
                                        description: 'Test Example',
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
    {
        package: 'https://github.com/eclipse-velocitas/vehicle-app-no-example-sdk',
        components: [
            {
                id: 'no-examples-test-core',
                type: 'core',
                name: 'Test Core Package with no examples',
                description: 'Test Core Package no examples',
                mandatory: false,
            },
        ],
    },
];

export const appManifestMock = [
    {
        name: 'sampleapp',
        vehicleModel: {},
        runtime: [],
    },
];

export const setupPackageManifestMock = {
    components: [
        {
            id: 'github-workflows',
            type: 'setup',
            files: [
                {
                    src: 'src/common',
                    dst: '.github',
                },
                {
                    src: 'src/${{ language }}/common',
                    dst: '.github',
                },
                {
                    src: 'src/${{ language }}/${{ repoType }}',
                    dst: '.github',
                },
            ],
            variables: [
                {
                    name: 'language',
                    type: 'string',
                    description: "The programming language of the project. Either 'python' or 'cpp'",
                },
                {
                    name: 'repoType',
                    type: 'string',
                    description: "The type of the repository: 'app' or 'sdk'",
                },
                {
                    name: 'appManifestPath',
                    type: 'string',
                    description: 'Path of the AppManifest file, relative to the .velocitas.json',
                },
                {
                    name: 'githubRepoId',
                    type: 'string',
                    description: 'The id of the repository, e.g. myOrg/myRepo.',
                },
            ],
        },
    ],
};

export const runtimePackageManifestMock = {
    components: [
        {
            id: 'test-runtime-local',
            alias: 'local',
            type: 'extension',
            programs: [
                {
                    id: 'test-script-1',
                    description: 'My test script',
                    executable: './src/test.sh',
                },
                {
                    id: 'test-script-2',
                    executable: './src/test.sh',
                },
            ],
            onPostInit: [
                {
                    ref: 'test-script-1',
                },
            ],
        },
        {
            id: 'test-runtime-deploy-local',
            alias: 'local',
            type: 'extension',
            programs: [
                {
                    id: 'test-script-1',
                    executable: './src/test.sh',
                },
                {
                    id: 'test-script-2',
                    executable: './src/test.sh',
                },
            ],
        },
    ],
};

export const corePackageManifestMock = {
    components: [
        {
            id: 'core-test',
            name: 'VApp (Python)',
            description: 'Velocitas VApp written in Python',
            type: 'core',
            programs: [
                {
                    id: 'create-project',
                    description: 'Creates a new uProtocol project',
                    executable: 'python',
                    args: ['core/vapp-python/.project-creation/run.py'],
                },
            ],
            variables: [
                {
                    name: 'language',
                    description: 'Programming language of the project.',
                    type: 'string',
                    default: 'python',
                },
            ],
        },
    ],
};

export const mockCacheContent = {
    myField: 'myValue',
};
