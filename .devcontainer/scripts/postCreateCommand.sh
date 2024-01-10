#!/bin/bash
# Copyright (c) 2023-2024 Contributors to the Eclipse Foundation
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

# Clone python template into devContainer to act as a testing playground for CLI development
echo "#######################################################"
echo "###        Clone vehicle-app-python-template        ###"
echo "###         to act as a testing playground          ###"
echo "###               for CLI execution                 ###"
echo "#######################################################"

rm -rf vehicle-app-repo/
git clone --depth=1 https://github.com/eclipse-velocitas/vehicle-app-python-template.git vehicle-app-repo

# add repo to git safe.directory
REPO=$(pwd)
git config --global --add safe.directory $REPO

echo "#######################################################"
echo "###  Install prerequisites for development of CLI   ###"
echo "###    Node, build-essentials, npm dependencies     ###"
echo "#######################################################"

./install_node.sh
rm -rf node_modules/
sudo apt-get -y install build-essential
npm ci

# Create alias to development CLI binary for testing inside devContainer
echo "alias velocitas=$REPO/bin/dev" >> ~/.zshrc
echo "alias velocitas=$REPO/bin/dev" >> ~/.bashrc

# Don't let container creation fail if lifecycle management fails
echo "Done!"
