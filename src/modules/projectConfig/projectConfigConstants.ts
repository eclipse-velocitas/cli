// Copyright (c) 2024 Contributors to the Eclipse Foundation
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

import { resolve } from 'node:path';
import { cwd } from 'node:process';

export type DesiredConfigFilePackages = {
    [name: string]: string;
};
export type DesiredConfigFileComponents = string[];
export type DesiredConfigFileVariables = {
    [name: string]: string;
};

const DEFAULT_CONFIG_FILE_NAME = '.velocitas.json';
export const DEFAULT_CONFIG_FILE_PATH = resolve(cwd(), DEFAULT_CONFIG_FILE_NAME);

const DEFAULT_CONFIG_LOCKFILE_NAME = '.velocitas-lock.json';
export const DEFAULT_CONFIG_LOCKFILE_PATH = resolve(cwd(), DEFAULT_CONFIG_LOCKFILE_NAME);

export const VARIABLE_SCOPE_SEPARATOR = '@';
