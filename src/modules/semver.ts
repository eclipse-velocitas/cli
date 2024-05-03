// Copyright (c) 2022-2024 Contributors to the Eclipse Foundation
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

import { SemVer, gt, maxSatisfying, satisfies, valid } from 'semver';
import { TagResult } from 'simple-git';

export const BRANCH_PREFIX = '@';

export function getLatestVersion(versions: string[]): string {
    let latestVersion: SemVer | undefined = undefined;
    for (const version of versions) {
        if (valid(version)) {
            if (!latestVersion) {
                latestVersion = new SemVer(version);
            } else {
                const currentVersion = new SemVer(version);
                if (gt(currentVersion, latestVersion)) {
                    latestVersion = currentVersion;
                }
            }
        } else {
            console.log('Not valid');
        }
    }

    if (!latestVersion) {
        throw new Error('No valid semver found!');
    }

    return latestVersion.raw;
}

export function resolveVersionIdentifier(versions: TagResult, versionIdentifier: string): string {
    if (versionIdentifier.startsWith(BRANCH_PREFIX)) {
        return versionIdentifier;
    }

    if (versionIdentifier === 'latest') {
        return versions.latest || getLatestVersion(versions.all);
    }

    const matchedVersion = maxSatisfying(versions.all, versionIdentifier);

    if (matchedVersion === null) {
        throw new Error(
            `Can't find matching version for ${versionIdentifier}. Prefix with '${BRANCH_PREFIX}' for a branch or use a valid semantic version.`,
        );
    }

    return matchedVersion;
}

export function incrementVersionRange(versionSpecifier: string, matchedVersion: string) {
    if (!satisfies(matchedVersion, versionSpecifier)) {
        return matchedVersion;
    }

    if (
        versionSpecifier.includes('*') ||
        versionSpecifier.includes('x') ||
        versionSpecifier.startsWith('^') ||
        versionSpecifier.startsWith('~')
    ) {
        return versionSpecifier;
    }

    return matchedVersion;
}
