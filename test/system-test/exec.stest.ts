import { expect } from 'chai';
import { spawn, spawnSync } from 'child_process';
import { join } from 'path';
import YAML from 'yaml';

const VELOCITAS_PROCESS = join('..', '..', process.env['VELOCITAS_PROCESS'] ? process.env['VELOCITAS_PROCESS'] : 'velocitas');

describe('CLI command', () => {
    describe('exec', () => {
        before(() => {
            process.chdir('./testbench/test-exec');
            spawnSync(VELOCITAS_PROCESS, ['init']);
        });
        it('should be able to exec all exposed program specs of runtime-local', async () => {
            const packageOutput = spawnSync(VELOCITAS_PROCESS, ['package', 'devenv-runtime-local'], { encoding: 'utf-8' });
            const parsedPackageOutput = YAML.parse(packageOutput.stdout.toString());
            const runtimeLocalComponent = parsedPackageOutput['devenv-runtime-local'].components.find(
                (component: any) => component.id === 'runtime-local'
            );
            let spawnSuccesful = false;
            for (const exposedProgramSpec of runtimeLocalComponent.programs) {
                console.log(`Try to spawn exposed program of 'runtime-local': ${exposedProgramSpec.id}`);
                spawnSuccesful = await checkSpawn(exposedProgramSpec.id);
                console.log(spawnSuccesful);
                console.log('Continue with next exposed program');
                continue;
            }
            expect(spawnSuccesful).to.be.true;
        });
    });
});

const checkSpawn = async (exposedProgramSpecId: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        try {
            const processSpawn = spawn(VELOCITAS_PROCESS, ['exec', 'runtime-local', exposedProgramSpecId], {
                stdio: 'inherit',
            });
            processSpawn.on('spawn', () => {
                console.log(`Spawned ${exposedProgramSpecId} succesfully - killing process`);
                processSpawn.kill();
                resolve(true);
            });
            processSpawn.on('error', () => {
                console.log(`Spawning ${exposedProgramSpecId} resulted in an error`);
                resolve(false);
            });
        } catch (e) {
            reject(e);
        }
    });
};
