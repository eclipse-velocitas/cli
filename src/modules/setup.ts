// Copyright (c) 2022 Robert Bosch GmbH
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

import { existsSync, Stats } from 'fs';
import { Transform } from 'node:stream';
import path, { join } from 'path';
import { cwd } from 'process';
import copy from 'recursive-copy';
import { TransformCallback, TransformOptions } from 'stream';
import { SetupComponent } from './component';
import { getPackageDirectory } from './package';
import { PackageConfig } from './project-config';
import { VariableCollection } from './variables';

class ReplaceVariablesStream extends Transform {
    private _fileExt: string;
    private _variables: VariableCollection;
    private _firstChunk: boolean;

    constructor(fileExt: string, variables: VariableCollection, opts?: TransformOptions | undefined) {
        super({ ...opts, readableObjectMode: true, writableObjectMode: true });
        this._fileExt = fileExt;
        this._variables = variables;
        this._firstChunk = true;
    }

    // we are overwriting the method from transform, hence we need to disable the name warning
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _transform(chunk: any, _: string, callback: TransformCallback) {
        let result = this._variables.substitute(chunk.toString());
        let noticeComment: string;
        const notice = 'This file is maintained by velocitas CLI, do not modify manually. Change settings in .velocitas.json';
        const shebang = '#!/bin/bash';
        const xmlDeclarationRegExp = new RegExp(`\\<\\?xml\\s.*?\\s\\?\\>`);

        if (this._firstChunk) {
            if (['.txt'].includes(this._fileExt)) {
                result = `${notice}\n${result}`;
            } else if (['.md', '.html', '.htm', '.xml', '.tpl'].includes(this._fileExt)) {
                noticeComment = `<!-- ${notice} -->`;
                const xmlDeclarationArray = xmlDeclarationRegExp.exec(result);
                if (xmlDeclarationArray !== null && result.startsWith(xmlDeclarationArray[0])) {
                    result = this._injectNoticeAfterStartLine(result, xmlDeclarationArray[0], noticeComment);
                } else {
                    result = `${noticeComment}\n${result}`;
                }
            } else if (['.yaml', '.yml', '.sh'].includes(this._fileExt)) {
                noticeComment = `# ${notice}`;
                if (result.startsWith(shebang)) {
                    result = this._injectNoticeAfterStartLine(result, shebang, noticeComment);
                } else {
                    result = `${noticeComment}\n${result}`;
                }
            } else if (['.json'].includes(this._fileExt)) {
                noticeComment = `// ${notice}`;
                result = `${noticeComment}\n${result}`;
            }

            this._firstChunk = false;
        }

        this.push(result);
        callback();
    }

    private _injectNoticeAfterStartLine(result: string, startingLine: string, noticeComment: string) {
        return `${result.slice(0, startingLine.length)}\n${noticeComment}${result.slice(startingLine.length)}`;
    }
}

export function installComponent(componentConfig: PackageConfig, setupComponent: SetupComponent, variables: VariableCollection) {
    for (const spec of setupComponent.files) {
        const src = variables.substitute(spec.src);
        const dst = variables.substitute(spec.dst);
        let ifCondition = spec.condition ? variables.substitute(spec.condition) : 'true';

        if (eval(ifCondition)) {
            const sourceFileOrDir = join(getPackageDirectory(componentConfig.name), componentConfig.version, src);
            const destFileOrDir = join(cwd(), dst);
            try {
                if (existsSync(sourceFileOrDir)) {
                    copy(sourceFileOrDir, destFileOrDir, {
                        dot: true,
                        overwrite: true,
                        transform: function (src: string, _: string, stats: Stats) {
                            if (
                                !['.md', '.yaml', '.yml', '.txt', '.json', '.sh', '.html', '.htm', '.xml', '.tpl'].includes(
                                    path.extname(src)
                                )
                            ) {
                                return null;
                            }

                            return new ReplaceVariablesStream(path.extname(src), variables);
                        },
                    });
                }
            } catch (e) {
                console.error(`Error during copy: ${e}`);
            }
        }
    }
}
