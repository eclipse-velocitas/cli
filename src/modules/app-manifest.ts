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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

export interface DockerImageReference {
    name: string;
    image: string;
    version: string;
}

export interface PythonReference {
    version: string;
}

export interface AppManifest {
    Name: string;
    Port: number;
    DAPR_GRPC_PORT: number;
    Dockerfile: string;
    dependencies: {
        services: DockerImageReference[];
        runtime: DockerImageReference[];
    };
    python: {
        version: string;
    } | null;
    dapr: {
        cli: {
            version: string;
        };
        runtime: {
            version: string;
        };
    };
}

export function readAppManifest(): AppManifest[] {
    const config: AppManifest[] = JSON.parse(readFileSync(resolve(cwd(), './app/AppManifest.json'), 'utf-8'));
    return config;
}
