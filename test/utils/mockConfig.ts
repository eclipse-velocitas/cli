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

import { ComponentType } from '../../src/modules/component';

export const velocitasConfigMock = {
    packages: [
        {
            name: 'test-runtime',
            version: 'v1.1.1',
            variables: { test: 'test' },
        },
        {
            name: 'test-setup',
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

export const packageIndexMock = [
    {
        type: 'extension',
        package: 'https://github.com/eclipse-velocitas/test-runtime.git',
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
        package: 'https://github.com/eclipse-velocitas/vehicle-app-test-sdk',
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

export const appManifestMock = [
    {
        name: 'sampleapp',
        vehicleModel: {},
        runtime: [],
    },
];

export const setupComponentManifestMock = {
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

export const runtimeComponentManifestMock = {
    components: [
        {
            id: 'test-runtime-local',
            alias: 'local',
            type: ComponentType.runtime,
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
            type: ComponentType.deployment,
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

export const mockCacheContent = {
    myField: 'myValue',
};
