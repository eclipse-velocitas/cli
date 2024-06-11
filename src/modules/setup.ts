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

import { Stats } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { cwd } from 'node:process';
import { Transform, TransformCallback, TransformOptions } from 'node:stream';
import copy from 'recursive-copy';
import { CliFileSystem } from '../utils/fs-bridge';
import { ComponentContext } from './component';
import { VariableCollection } from './variables';

const NOTICE_COMMENT = 'This file is maintained by velocitas CLI, do not modify manually. Change settings in .velocitas.json';

/**
 * Interface for implementing comment insertion hints for supported text files.
 */
interface CommentInsertionHint {
    // one or multiple extensions of the file
    ext?: string[] | string;

    // one or more special filenames of the file (e.g. Dockerfile)
    filename?: string[] | string;

    // a comment template which will be used for the comment line. Occurrences of %COMMENT% will be replaced by the actual comment literal.
    commentTemplate?: string;

    // a matcher which finds an appropriate position in the text to insert the comment **after**
    insertAfterLineMatcher?: string | RegExp;
}

const filetypesForCommentInsertion: CommentInsertionHint[] = [
    {
        ext: '.txt',
    },
    {
        ext: ['.md'],
        commentTemplate: '<!-- %COMMENT% -->',
    },
    {
        ext: ['.html', '.htm', '.xml', '.tpl'],
        commentTemplate: '<!-- %COMMENT% -->',
        insertAfterLineMatcher: new RegExp(`\\<\\?xml\\s.*?\\s\\?\\>`),
    },
    {
        ext: '.json',
        commentTemplate: '// %COMMENT%',
    },
    {
        ext: ['.yml', '.yaml'],
        commentTemplate: '# %COMMENT%',
    },
    {
        ext: '.sh',
        commentTemplate: '# %COMMENT%',
        insertAfterLineMatcher: '#!/bin/bash',
    },
    {
        ext: '.dockerfile',
        filename: 'Dockerfile',
        commentTemplate: '# %COMMENT%',
    },
];

function maybeCreateReplaceVariablesTransform(filename: string, variables: VariableCollection): ReplaceVariablesTransform | null {
    const transform = new ReplaceVariablesTransform(filename, variables);
    if (transform.canHandleFile()) {
        return transform;
    }
    return null;
}

class ReplaceVariablesTransform extends Transform {
    private _filename: string;
    private _fileExt: string;
    private _variables: VariableCollection;
    private _firstChunk: boolean;

    constructor(filename: string, variables: VariableCollection, opts?: TransformOptions | undefined) {
        super({ ...opts, readableObjectMode: true, writableObjectMode: true });
        this._filename = filename;
        this._fileExt = extname(this._filename);
        this._variables = variables;
        this._firstChunk = true;
    }

    private _hasMatchingFileExtension(transformableFiletype: CommentInsertionHint): boolean {
        let extensionMatches = false;
        if (transformableFiletype.ext) {
            const ext = transformableFiletype.ext;
            extensionMatches = (typeof ext === 'string' && ext === this._fileExt) || (Array.isArray(ext) && ext.includes(this._fileExt));
        }
        return extensionMatches;
    }

    private _hasMatchingFilename(transformableFiletype: CommentInsertionHint): boolean {
        let filenameMatches = false;
        if (transformableFiletype.filename) {
            const filename = transformableFiletype.filename;
            filenameMatches =
                (typeof filename === 'string' && filename === this._filename) ||
                (Array.isArray(filename) && filename.includes(this._filename));
        }
        return filenameMatches;
    }

    private _isKnownFile(transformableFiletype: CommentInsertionHint): boolean {
        return this._hasMatchingFileExtension(transformableFiletype) || this._hasMatchingFilename(transformableFiletype);
    }

    private _findInsertionLine(textChunk: string, transformableFiletype: CommentInsertionHint): string | undefined {
        let insertionLine: string | undefined;
        if (transformableFiletype.insertAfterLineMatcher) {
            const needle = transformableFiletype.insertAfterLineMatcher;
            if (typeof needle === 'string') {
                const lines = textChunk.split('\n');
                for (const line of lines) {
                    if (needle === line) {
                        insertionLine = line;
                        break;
                    }
                }
            } else if (needle instanceof RegExp) {
                const regexResult = needle.exec(textChunk);
                if (regexResult) {
                    insertionLine = regexResult[0];
                }
            }
        }
        return insertionLine;
    }

    private _insertCommentAfterLine(textChunk: string, startingLine: string, noticeComment: string): string {
        return `${textChunk.slice(0, startingLine.length)}\n${noticeComment}${textChunk.slice(startingLine.length)}`;
    }

    private _tryInsertNoticeComment(textChunk: string): string {
        for (const transformableFiletype of filetypesForCommentInsertion) {
            if (!transformableFiletype.commentTemplate) {
                continue;
            }

            if (!this._isKnownFile(transformableFiletype)) {
                continue;
            }

            const comment = transformableFiletype.commentTemplate?.replace('%COMMENT%', NOTICE_COMMENT);
            const insertionLine = this._findInsertionLine(textChunk, transformableFiletype);
            if (insertionLine) {
                textChunk = this._insertCommentAfterLine(textChunk, insertionLine, comment);
            } else {
                // no line found to insert after, hence insert at the very top
                textChunk = `${comment}\n${textChunk}`;
            }
        }

        return textChunk;
    }

    // we are overwriting the method from transform, hence we need to disable the name warning
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _transform(chunk: any, _: string, callback: TransformCallback) {
        let textChunk = this._variables.substitute(chunk.toString());

        if (this._firstChunk) {
            textChunk = this._tryInsertNoticeComment(textChunk);
            this._firstChunk = false;
        }

        this.push(textChunk);
        callback();
    }

    public canHandleFile(): boolean {
        for (const transformableFiletype of filetypesForCommentInsertion) {
            if (this._isKnownFile(transformableFiletype)) {
                return true;
            }
        }
        return false;
    }
}

export function installComponent(component: ComponentContext, variables: VariableCollection) {
    if (component.manifest.files) {
        for (const spec of component.manifest.files) {
            const src = variables.substitute(spec.src);
            const dst = variables.substitute(spec.dst);
            let ifCondition = spec.condition ? variables.substitute(spec.condition) : 'true';

            if (eval(ifCondition)) {
                const sourceFileOrDir = join(component.getComponentPath(), src);
                const destFileOrDir = join(cwd(), dst);
                try {
                    if (CliFileSystem.existsSync(sourceFileOrDir)) {
                        copy(sourceFileOrDir, destFileOrDir, {
                            dot: true,
                            overwrite: true,
                            transform: function (src: string, _: string, stats: Stats) {
                                return maybeCreateReplaceVariablesTransform(basename(src), variables);
                            },
                        });
                    }
                } catch (e) {
                    console.error(`Error during copy: ${e}`);
                }
            }
        }
    }
}
