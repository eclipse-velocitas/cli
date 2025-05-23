// Copyright (c) 2024-2025 Contributors to the Eclipse Foundation
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
import { copySync, removeSync } from 'fs-extra';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { DEFAULT_BUFFER_ENCODING } from '../../src/modules/constants';
import { TEST_ROOT, VELOCITAS_HOME, VELOCITAS_PROCESS } from '../utils/systemTestConfig';

const packageManifestOne = JSON.parse(
    readFileSync('./testbench/test-sync/packages/test-packageOne/test-version/manifest.json', DEFAULT_BUFFER_ENCODING),
);
const packageManifestTwo = JSON.parse(
    readFileSync('./testbench/test-sync/packages/test-packageTwo/test-version/manifest.json', DEFAULT_BUFFER_ENCODING),
);

const fileOneDestination = packageManifestOne.components[0].files[0].dst;
const fileTwoDestination = packageManifestTwo.components[0].files[0].dst;
const fileThreeDestination = packageManifestTwo.components[1].files[0].dst;
const fileFourDestination = packageManifestTwo.components[2].files[0].dst;

describe('CLI command', () => {
    describe('sync', () => {
        beforeEach(() => {
            process.chdir(`${TEST_ROOT}/testbench/test-sync`);
            copySync('./packages', `${VELOCITAS_HOME}/packages`);
        });
        afterEach(() => {
            removeSync(`./${fileOneDestination}`);
            removeSync(`./${fileTwoDestination}`);
            removeSync(`./${fileThreeDestination}`);
            removeSync(`./${fileFourDestination}`);
        });
        it('should sync configured setup components and replace variables accordingly', async () => {
            const syncOutput = spawnSync(VELOCITAS_PROCESS, ['sync'], { encoding: DEFAULT_BUFFER_ENCODING });
            expect(syncOutput.status).to.equal(0);

            const resultOne = readFileSync(`./${fileOneDestination}`, {
                encoding: DEFAULT_BUFFER_ENCODING,
            });
            expect(resultOne).to.equal(
                `#!/bin/bash
# This file is maintained by velocitas CLI, do not modify manually. Change settings in .velocitas.json
# Copyright (c) 2024 Contributors to the Eclipse Foundation
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0

echo projectTest
echo packageTestOne
echo 1
`,
            );

            const resultTwo = readFileSync(`./${fileTwoDestination}`, {
                encoding: DEFAULT_BUFFER_ENCODING,
            });
            expect(resultTwo).to.equal(
                `#!/bin/bash
# This file is maintained by velocitas CLI, do not modify manually. Change settings in .velocitas.json
# Copyright (c) 2024 Contributors to the Eclipse Foundation
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0

echo projectTest
echo packageTestTwo
echo 2
`,
            );

            const resultThree = readFileSync(`./${fileThreeDestination}`, {
                encoding: DEFAULT_BUFFER_ENCODING,
            });
            expect(resultThree).to.equal('A nested file\n');

            const resultFour = readFileSync(`./${fileFourDestination}`, {
                encoding: DEFAULT_BUFFER_ENCODING,
            });
            expect(resultFour).to.equal(
                `# This file is maintained by velocitas CLI, do not modify manually. Change settings in .velocitas.json
# Copyright (c) 2024 Contributors to the Eclipse Foundation
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0

FROM packageTestTwo

RUN ls -al
`,
            );
        });
    });
});
