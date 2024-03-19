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

import * as fse from 'fs-extra';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { DEFAULT_BUFFER_ENCODING } from '../modules/constants';

/**
 * Interface representing needed file system methods.
 */
interface IFileSystem {
    /**
     * Synchronously reads the entire contents of a file.
     * @param path A path to a file or a file descriptor.
     * @returns The contents of the file.
     */
    readFileSync(path: fs.PathOrFileDescriptor): string;

    /**
     * Tests whether or not the given path exists by checking with the file system.
     * @param path A path to a file or directory.
     * @returns `true` if the path exists, `false` otherwise.
     */
    existsSync(path: fs.PathLike): boolean;

    /**
     * Synchronously creates a directory.
     * @param path A path to the directory to create.
     * @returns `undefined` if the directory was created successfully, otherwise an error.
     */
    mkdirSync(path: fs.PathLike): string | undefined;

    /**
     * Synchronously writes data to a file, replacing the file if it already exists.
     * @param path A path to the file to write to.
     * @param data The data to write to the file.
     */
    writeFileSync(path: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView): void;

    /**
     * Synchronously writes data to a file, creating any directories in the path if they don't exist.
     * @param file A path to the file to write to.
     * @param data The data to write to the file.
     */
    outputFileSync(file: string, data: string | NodeJS.ArrayBufferView): void;

    /**
     * Returns the canonicalized absolute pathname of the specified path.
     * @param path A path to a file or directory.
     * @returns The absolute path.
     */
    realpathSync(path: fs.PathLike): string;
}

/**
 * Interface representing needed file system methods exclusively for tests.
 */
interface IFileSystemTests {
    /**
     * Asynchronously creates a directory.
     * @param path A path to the directory to create.
     * @returns `undefined` if the directory was created successfully, otherwise an error.
     */
    promisesMkdir(path: string): Promise<void>;

    /**
     * Asynchronously writes data to a file, replacing the file if it already exists.
     * @param path A path to the file to write to.
     * @param data The data to write to the file.
     */
    promisesWriteFile(path: string, data: any): Promise<any>;
}

/**
 * Represents an implementation for the real file system.
 */
class RealFileSystem implements IFileSystem {
    readFileSync(path: fs.PathOrFileDescriptor): string {
        return fs.readFileSync(path, DEFAULT_BUFFER_ENCODING);
    }

    existsSync(path: fs.PathLike): boolean {
        return fs.existsSync(path);
    }

    mkdirSync(path: fs.PathLike): string | undefined {
        return fs.mkdirSync(path, { recursive: true });
    }

    writeFileSync(path: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView): void {
        fs.writeFileSync(path, data, { encoding: DEFAULT_BUFFER_ENCODING });
    }

    outputFileSync(file: string, data: string | NodeJS.ArrayBufferView): void {
        fse.outputFileSync(file, data);
    }

    realpathSync(path: fs.PathLike): string {
        return fs.realpathSync(path);
    }
}

export type MockFileSystemObj = Record<string, string>;

/**
 * Represents an implementation for a mocked file system.
 */
export class MockFileSystem implements IFileSystem, IFileSystemTests {
    private _fileSystemObj: MockFileSystemObj;

    constructor(fileSystemObj: MockFileSystemObj) {
        this._fileSystemObj = fileSystemObj;
    }

    readFileSync(path: fs.PathOrFileDescriptor): string {
        const filePath = path.toString().startsWith('./') ? join(cwd(), path.toString()) : path.toString();
        return this._fileSystemObj[filePath];
    }

    existsSync(path: fs.PathLike): boolean {
        return Object.keys(this._fileSystemObj).some((key) => key.match(path.toString()));
    }

    mkdirSync(path: fs.PathLike): string | undefined {
        return (this._fileSystemObj[path.toString()] = '');
    }

    writeFileSync(path: fs.PathOrFileDescriptor, data: any): void {
        this._fileSystemObj[path.toString()] = data;
    }

    outputFileSync(path: string, data: any): void {
        this._fileSystemObj[path.startsWith('./') ? join(cwd(), path) : path] = data;
    }

    realpathSync(path: fs.PathLike): string {
        return path.toString();
    }

    async promisesMkdir(path: string): Promise<void> {
        this._fileSystemObj[path] = '';
    }

    async promisesWriteFile(path: string, data: any): Promise<any> {
        return (this._fileSystemObj[path] = data);
    }
}

/**
 * Class providing file system operations for usage within the CLI.
 */
export class CliFileSystem {
    private static _impl: IFileSystem = new RealFileSystem();

    static setImpl(impl: IFileSystem) {
        this._impl = impl;
    }

    private constructor() {}

    /**
     * Synchronously reads the entire contents of a file.
     * @param path A path to a file or a file descriptor.
     * @returns The contents of the file.
     */
    static readFileSync(path: fs.PathOrFileDescriptor): string {
        return this._impl.readFileSync(path);
    }

    /**
     * Tests whether or not the given path exists by checking with the file system.
     * @param path A path to a file or directory.
     * @returns `true` if the path exists, `false` otherwise.
     */
    static existsSync(path: fs.PathLike): boolean {
        return this._impl.existsSync(path);
    }

    /**
     * Synchronously creates a directory.
     * @param path A path to the directory to create.
     * @returns `undefined` if the directory was created successfully, otherwise an error.
     */
    static mkdirSync(path: fs.PathLike): string | undefined {
        return this._impl.mkdirSync(path);
    }

    /**
     * Synchronously writes data to a file, replacing the file if it already exists.
     * @param path A path to the file to write to.
     * @param data The data to write to the file.
     */
    static writeFileSync(path: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView): void {
        this._impl.writeFileSync(path, data);
    }

    /**
     * Synchronously writes data to a file, creating any directories in the path if they don't exist.
     * @param file A path to the file to write to.
     * @param data The data to write to the file.
     */
    static outputFileSync(file: string, data: string | NodeJS.ArrayBufferView): void {
        this._impl.outputFileSync(file, data);
    }

    /**
     * Returns the canonicalized absolute pathname of the specified path.
     * @param path A path to a file or directory.
     * @returns The absolute path.
     */
    static realpathSync(path: fs.PathLike): string {
        return this._impl.realpathSync(path);
    }

    /**
     * Asynchronously creates a directory.
     * @param path A path to the directory to create.
     * @returns `undefined` if the directory was created successfully, otherwise an error.
     */
    static async promisesMkdir(path: string): Promise<void> {
        if ('promisesMkdir' in this._impl) {
            return (this._impl as unknown as IFileSystemTests).promisesMkdir(path);
        } else {
            throw new Error('Method not implemented in the provided implementation.');
        }
    }

    /**
     * Asynchronously writes data to a file, replacing the file if it already exists.
     * @param path A path to the file to write to.
     * @param data The data to write to the file.
     */
    static async promisesWriteFile(path: string, data: any): Promise<any> {
        if ('promisesWriteFile' in this._impl) {
            return (this._impl as unknown as IFileSystemTests).promisesWriteFile(path, data);
        } else {
            throw new Error('Method not implemented in the provided implementation.');
        }
    }
}
