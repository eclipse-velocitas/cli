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

export const defaultConfigMock = {
    packages: [
        {
            name: 'test-runtime',
            version: 'v1.0.0',
        },
    ],
};

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

export const appManifestMock = [
    {
        Name: 'sampleapp',
        Port: 50008,
        DAPR_GRPC_PORT: 50001,
        Dockerfile: './app/Dockerfile',
        dependencies: {
            services: [
                {
                    name: 'test-dependency-service',
                    image: 'test-service-image',
                    version: 'v0.0.1',
                },
            ],
            runtime: [
                {
                    name: 'test-dependency-runtime',
                    image: 'test-runtime',
                    version: '0.0.1',
                },
            ],
        },
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
            start: [
                {
                    id: 'test-script-1',
                    startupLine: 'Runtime Start Test',
                },
                {
                    id: 'test-script-2',
                    dependsOn: 'test-script-1',
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
            start: [
                {
                    id: 'test-script-1',
                    startupLine: 'Runtime Start Test',
                },
                {
                    id: 'test-script-2',
                    dependsOn: 'test-script-1',
                },
            ],
        },
    ],
};
