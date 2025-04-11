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
import 'mocha';
import { ComponentConfig, ComponentContext, ComponentManifest } from '../../src/modules/component';
import { PackageConfig, getPackageFolderPath } from '../../src/modules/package';
import { join } from 'path';

function createDefaultComponentContext(basePath?: string): ComponentContext {
    const componentId = "componentUnderTest";
    const pkgConfig = new PackageConfig({ repo: "packageUnderTest", version: "main" });
    const componentManifest: ComponentManifest = {
        id: componentId,
        basePath: basePath
    };
    const componentConfig = new ComponentConfig(componentId);
    return new ComponentContext(pkgConfig, componentManifest, componentConfig, true);
}

describe('component - module', () => {
    describe('ComponentContext`s getComponentPath function', () => {
        it('should return the package path as the component path, if no base path is given', () => {
            const componentContext = createDefaultComponentContext();
            expect(componentContext.getComponentPath()).to.equal(join(getPackageFolderPath(), "packageUnderTest", "main"));
        });

        it('should return the package path extended by the basePath as the component path, if a base path is given', () => {
            const componentContext = createDefaultComponentContext("foo/bar");
            expect(componentContext.getComponentPath()).to.equal(join(getPackageFolderPath(), "packageUnderTest", "main", "foo", "bar"));
        });
    });
});
