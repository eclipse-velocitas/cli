import { existsSync } from 'fs-extra';
import { posix as pathPosix } from 'path';
import { CheckRepoActions, SimpleGit, simpleGit } from 'simple-git';
import { PackageConfig } from './package';

export class GitHelper {
    packageConfig: PackageConfig;

    constructor(packageConfig: PackageConfig) {
        this.packageConfig = packageConfig;
    }

    async cloneRepository(packageDir: string, cloneOpts: string[]): Promise<void> {
        await simpleGit().clone(this.packageConfig.getPackageRepo(), packageDir, cloneOpts);
    }

    async updateRepository(git: SimpleGit, checkRepoAction: CheckRepoActions, packageDir: string, cloneOpts: string[]): Promise<void> {
        const localRepoExists = await git.checkIsRepo(checkRepoAction);

        if (localRepoExists) {
            await git.fetch(['--all']);
        } else {
            await git.clone(this.packageConfig.getPackageRepo(), packageDir, cloneOpts);
        }
    }

    async checkoutVersion(git: SimpleGit): Promise<void> {
        await git.checkout(this.packageConfig.version);
    }

    async removeGitFolder(packageDir: string): Promise<void> {
        // if (!this.packageConfig.dev) {
        //     removeSync(pathPosix.join(packageDir, '.git'));
        // }
    }

    async cloneOrUpdateRepo(check: boolean): Promise<SimpleGit> {
        let packageDir: string = this.packageConfig.getPackageDirectory();
        let cloneOpts: string[] = [];
        let checkRepoAction: CheckRepoActions;

        if (check) {
            packageDir = pathPosix.join(packageDir, '_cache');
            cloneOpts.push('--bare');
            checkRepoAction = CheckRepoActions.BARE;
        } else {
            packageDir = pathPosix.join(packageDir, this.packageConfig.version);
            checkRepoAction = CheckRepoActions.IS_REPO_ROOT;
        }

        if (!existsSync(packageDir)) {
            await this.cloneRepository(packageDir, cloneOpts);
        }

        const git: SimpleGit = simpleGit(packageDir);
        await this.updateRepository(git, checkRepoAction, packageDir, cloneOpts);

        if (!check) {
            await this.checkoutVersion(git);
            await this.removeGitFolder(packageDir);
        }

        return git;
    }
}
