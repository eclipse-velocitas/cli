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

import { expect } from 'chai';
import 'mocha';
import { TagResult } from 'simple-git';
import { getLatestVersion, getMatchedVersion, incrementVersionRange } from '../../src/modules/semver';

describe('getLatestVersion', () => {
    it('should return the latest version from the provided array', () => {
        const versions = ['1.0.0', '2.0.0', '0.1.0'];
        expect(getLatestVersion(versions)).to.equal('2.0.0');
    });

    it('should throw an error if no valid semver is found', () => {
        const versions = ['invalid'];
        expect(() => getLatestVersion(versions)).to.throw('No valid semver found!');
    });
});

describe('getMatchedVersion', () => {
    const versions: TagResult = {
        all: ['1.0.0', '2.0.0', '3.0.0'],
        latest: '3.0.0',
    };

    it('should return the specified branch if it starts with "@"', () => {
        expect(getMatchedVersion(versions, '@myBranch')).to.equal('myBranch');
    });

    it('should return the latest version if versionIdentifier is "latest"', () => {
        expect(getMatchedVersion(versions, 'latest')).to.equal('3.0.0');
    });

    it('should return the matched version from the versions array', () => {
        expect(getMatchedVersion(versions, '^2.0.0')).to.equal('2.0.0');
    });

    it('should throw an error if no matching version is found', () => {
        expect(() => getMatchedVersion(versions, '4.0.0')).to.throw("Can't find matching version for 4.0.0");
    });
});

describe('incrementVersionRange', () => {
    it('should return the matched version if it does not satisfy the version specifier', () => {
        expect(incrementVersionRange('^2.0.0', '3.0.0')).to.equal('3.0.0');
    });

    it('should return the version specifier if it contains "*" or "x"', () => {
        expect(incrementVersionRange('2.*', '2.1.0')).to.equal('2.*');
        expect(incrementVersionRange('~1.x', '1.2.0')).to.equal('~1.x');
    });

    it('should increment the version range correctly if it starts with "^" or "~"', () => {
        expect(incrementVersionRange('^1.0.0', '1.1.0')).to.equal('^1.1.0');
        expect(incrementVersionRange('~2.0.0', '2.0.1')).to.equal('~2.0.1');
    });

    it('should return the matched version otherwise', () => {
        expect(incrementVersionRange('1.0.0', '1.0.0')).to.equal('1.0.0');
        expect(incrementVersionRange('2.0.0', '2.0.0')).to.equal('2.0.0');
    });
});
