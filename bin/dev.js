#!/usr/bin/env -S node --import tsx/esm --no-warnings=ExperimentalWarning

import { execute } from '@oclif/core';
import * as fs from 'fs';

const VELOCITAS_CONFIG = '.velocitas.json';
const PACKAGE_INDEX = 'package-index.json';
// This check is only for executing the CLI locally inside devcontainer
// if (!(fs.existsSync(VELOCITAS_CONFIG) || fs.existsSync(PACKAGE_INDEX))) {
//     console.log(`No ${VELOCITAS_CONFIG} or ${PACKAGE_INDEX} found in current working directory. Change directory to 'vehicle-app-repo'.`);
//     process.exit(1);
// }

(async () => {
    await execute({ development: true, dir: import.meta.url });
})();
