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

print("my_cache_key=my_cache_value >> VELOCITAS_CACHE")
print("foo = bar >> VELOCITAS_CACHE")
print("x=y >>  VELOCITAS_CACHE")
print("0123='random' >> VELOCITAS_CACHE")
print('arr1=["/path/test1", "/path/test2"] >> VELOCITAS_CACHE')
print('arr2=["/path/test1" ,"/path/test2"] >> VELOCITAS_CACHE')
print('arr3=["/path/test1","/path/test2"] >> VELOCITAS_CACHE')
print("var=\"asdc' >> VELOCITAS_CACHE")
