import { Args, Command, Flags } from '@oclif/core';
import { mapReplacer } from '../../modules/helpers.js';
import { ProjectCache } from '../../modules/project-cache.js';
import { ProjectConfig } from '../../modules/project-config.js';

export default class Cache extends Command {
    static description = 'Get the complete cache contents as JSON string or the value of a single key.';

    static examples = [
        `$ velocitas cache get
{"foo":"bar"}`,
        `$ velocitas cache get foo
bar`,
    ];

    static args = {
        key: Args.string({ description: 'The key of a single cache entry to get.', required: false }),
    };
    async run(): Promise<void> {
        //     const { args } = await this.parse(Cache);
        //     // although we are not reading the project config, we want to
        //     // ensure the command is run in a project directory only.
        //     ProjectConfig.read(`v${this.config.version}`);
        //     const cache = ProjectCache.read();
        //     let output = JSON.stringify(cache.raw(), mapReplacer);
        //     if (args.key) {
        //         output = cache.get(args.key);
        //     }
        //     this.log(output);
    }
}
