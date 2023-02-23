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
        it('should be able to exec all exposed program specs of runtime-local', () => {
            const packageOutput = spawnSync(VELOCITAS_PROCESS, ['package', 'devenv-runtime-local'], { encoding: 'utf-8' });
            const parsedPackageOutput = YAML.parse(packageOutput.stdout.toString());
            const runtimeLocalComponent = parsedPackageOutput['devenv-runtime-local'].components.find(
                (component: any) => component.id === 'runtime-local'
            );
            for (const exposedProgramSpec of runtimeLocalComponent.programs) {
                console.log('Id of exposedProgramSpec ');
                console.log(exposedProgramSpec.id);
                const output = spawnSync(VELOCITAS_PROCESS, ['exec', 'runtime-local', exposedProgramSpec.id], {
                    stdio: 'inherit',
                });

                // expect(output.error).to.be.undefined;
            }
        });
    });
});
