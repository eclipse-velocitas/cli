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

import { info } from 'console';
import { ProjectCache } from './project-cache';

const CACHE_OUTPUT_REGEX: RegExp =
    /(\w+)\s*=\s*(\[((\'(\/*\w+)*\',\s*|(\"(\/*\w+)*\",\s*)|(\/*\w+)*,\s*|\'(\/*\w+)*\'(?=\])|\"(\/*\w+)*\"(?=\])|(\/*\w+)*(?=\]))*\])|(\'.*?\'|\".*?\"|\w+))\s+\>\>\s+VELOCITAS_CACHE/;

export function stdOutParser(projectCache: ProjectCache, line: string) {
    let lineTrimmed = (line as string).trim();

    if (lineTrimmed.length === 0) {
        return;
    }
    const match = CACHE_OUTPUT_REGEX.exec(line);
    if (match && match.length > 0) {
        const [_ignored, key, value] = match;
        const cleanedValue = value.replace(/['"]/g, '');
        info(cleanedValue);
        info(key);
        if (cleanedValue.startsWith('[') && cleanedValue.endsWith(']')) {
            const arrayPart = cleanedValue.substring(1, cleanedValue.length - 1);
            const array = arrayPart.split(',');
            const trimmedArray = array.map((str) => str.trim());
            projectCache.set(key, trimmedArray);
        } else {
            projectCache.set(key, cleanedValue);
        }
    }
}
