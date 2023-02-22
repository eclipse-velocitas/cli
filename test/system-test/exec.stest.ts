import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { join } from 'path';

const VELOCITAS_PROCESS = join('..', '..', process.env['VELOCITAS_PROCESS'] ? process.env['VELOCITAS_PROCESS'] : 'velocitas');

describe('CLI command', () => {
    describe('exec', () => {
        before(() => {
            process.chdir('./testbench/test-exec');
            spawnSync(VELOCITAS_PROCESS, ['init']);
        });
        it('should be able to install dapr', () => {
            const output = spawnSync(VELOCITAS_PROCESS, ['exec', 'runtime-local', 'ensure-dapr'], {
                stdio: 'inherit',
            });

            expect(output.error).to.be.undefined;
        });
    });
});
