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

import { PackageIndex, CoreComponent, ExtensionComponent } from './package-index.js';
import { AppManifestInterfaceAttributes } from './app-manifest.js';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Create from '../commands/create/index.js';

/**
 * Result of the core prompt in the interactive mode.
 * @interface CorePromptResult
 * @prop {Core} chosenCore - The selected core.
 * @prop {string} [appName] - The name of the application.
 * @prop {boolean} [example] - Indicates whether an example should be used.
 */
export interface CorePromptResult {
    chosenCore: CoreComponent;
    appName: string;
    example: boolean;
}

export class InteractiveMode {
    /**
     * Configures the core settings interactively.
     * @param availableCores - Available cores to choose from.
     * @returns {Promise<CorePromptResult>} - Object containing all data received by prompts for the core.
     */
    static async configureCore(availableCores: CoreComponent[]): Promise<CorePromptResult> {
        let promptResult = await Create.prompts.core(availableCores);
        let corePromptResult: CorePromptResult = {
            chosenCore: promptResult as CoreComponent,
            appName: '',
            example: false,
        };

        const sets = corePromptResult.chosenCore.options;
        if (sets !== undefined) {
            let chosenCoreOptionId = 0;
            if (sets.length > 0) {
                const coreOptionsPromptResult = await Create.prompts.coreOptions(sets);
                chosenCoreOptionId = coreOptionsPromptResult;
            }

            for (const parameter of sets[chosenCoreOptionId].parameters) {
                const coreParametersPromptResult = await Create.prompts.coreParameters(parameter);
                corePromptResult.appName = coreParametersPromptResult;
                if (parameter.id === 'example') {
                    corePromptResult.example = true;
                }
            }
        }
        return corePromptResult;
    }

    /**
     * Configures the extensions interactively.
     * @param packageIndex - The package index containing available extensions.
     * @param corePromptResult - The result of core configuration.
     * @returns {Promise<AppManifestInterfaceAttributes[]>} - Array of app manifest interface attributes.
     */
    static async configureExtensions(
        packageIndex: PackageIndex,
        corePromptResult: CorePromptResult,
    ): Promise<AppManifestInterfaceAttributes[]> {
        const appManifestInterfaceEntries: AppManifestInterfaceAttributes[] = [];
        if (corePromptResult.example) {
            return appManifestInterfaceEntries;
        }
        const availableExtensions = packageIndex
            .getExtensions()
            .filter((ext: ExtensionComponent) =>
                ext.compatibleCores.find((compatibleCore: string) => !ext.mandatory && compatibleCore === corePromptResult.chosenCore.id),
            );

        if (availableExtensions.length === 0) {
            return appManifestInterfaceEntries;
        }

        let extensionPromptResult = await Create.prompts.extensions(availableExtensions);

        for (const selectedExtension of extensionPromptResult) {
            const typedExtension = selectedExtension as ExtensionComponent;
            appManifestInterfaceEntries.push(
                await Create.createAppManifestInterfaceAttributes(typedExtension.id, typedExtension.parameters!),
            );
        }
        return appManifestInterfaceEntries;
    }
}
