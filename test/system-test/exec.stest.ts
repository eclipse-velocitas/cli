import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { join } from 'path';
import YAML from 'yaml';

const VELOCITAS_PROCESS = join('..', '..', process.env['VELOCITAS_PROCESS'] ? process.env['VELOCITAS_PROCESS'] : 'velocitas');

describe('CLI command', () => {
    describe('exec', () => {
        before(() => {
            process.chdir('./testbench/test-exec');
            spawnSync(VELOCITAS_PROCESS, ['init']);
        });
        it('should be able to install dapr', () => {
            const packageOutput = spawnSync(VELOCITAS_PROCESS, ['package', 'devenv-runtime-local'], { encoding: 'utf-8' });
            const parsedPackageOutput = YAML.parse(packageOutput.stdout.toString());

            for (const exposedProgramSpec of parsedPackageOutput['devenv-runtime-local'].components['runtime-local'].programs) {
                console.log('Id of exposedProgramSpec ');
                console.log(exposedProgramSpec.id);
            }

            const output = spawnSync(VELOCITAS_PROCESS, ['exec', 'runtime-local', 'ensure-dapr'], {
                stdio: 'inherit',
            });

            expect(output.error).to.be.undefined;
        });
    });
});
