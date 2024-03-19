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

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { DEFAULT_BUFFER_ENCODING } from '../../src/modules/constants';

export const VELOCITAS_PROCESS = resolve(__dirname, '..', '..', process.env['VELOCITAS_PROCESS'] || 'velocitas');
export const TEST_ROOT = cwd();
export const VELOCITAS_HOME = `${homedir()}/.velocitas`;

const packageIndexPath = resolve(__dirname, '../../testbench/test-create/vehicle-app-template/package-index.json');
export const packageIndex = JSON.parse(readFileSync(packageIndexPath, DEFAULT_BUFFER_ENCODING));
