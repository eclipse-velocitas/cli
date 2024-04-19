Velocitas CLI - The project lifecycle manager for your Vehicle Apps
=================================

[![CI Workflow](https://github.com/eclipse-velocitas/cli/actions/workflows/ci.yml/badge.svg#branch=main)](https://github.com/eclipse-velocitas/cli/actions/workflows/ci.yml)
[![License: Apache](https://img.shields.io/badge/License-Apache-yellow.svg)](http://www.apache.org/licenses/LICENSE-2.0)

<!-- toc -->
* [Introduction](#introduction)
* [Problem](#problem)
* [Solution](#solution)
* [Getting started](#getting-started)
* [Commands](#commands)
* [Installation](#installation)
* [Configuration](#configuration)
* [Advanced topics](#advanced-topics)
* [Contribution](#contribution)
<!-- tocstop -->

# Introduction

The CLI implements the [lifecyle management](https://eclipse.dev/velocitas/docs/concepts/lifecycle_management/) concept of the development environment of
a Vehicle App.

It allows *us* to take care of the development environment while *you* focus on the business logic of your vehicle application.

# Problem

Once created from either template or any other means of project creation, your new _Vehicle App_ repository is in isolation. It contains much more than just your app's source code - things you ideally do not want to worry about (i.e. CI/CD workflows, runtimes, build systems, devContainer configuration, ...). Pulling in changes from the mainline without breaking your custom changes is tedious and error prone. Moreover there are no mechanisms of getting notified about updates to the mainline that potentially fixes a bug or introduces a long sought for feature.

# Solution

This is where the CLI comes in - it manages everything in your repo which is not related to your _Vehicle App_'s source code as packages which are maintained by the _Velocitas_ team. The CLI allows you to download the latest versions and integrate the latest changes with ease.

It also comes on a mix and match basis: You need more than the native, default runtime? Simply add the Kanto runtime to your project. Ever want to migrate from Github to Gitee? Simply switch packages.

This is enabled by 3 main features the CLI provides:

* **Packages may expose programs** - These programs can be implemented in any scripting or programing language as long as the host has access to the runtime or binary of the program. The CLI masks these behind IDs. See [the exec command](#velocitas-exec-component-id) for details.
* **Packages may synchronize files into your repository** - Unlike programs, some files cannot live outside of your checked in repository. This especially applies for Github workflows. These need to be synchronized into your repository and checked in. To do this, the CLI provides [the sync command](#velocitas-sync).
* **Executed programs or synchronized files have access to variables** - More often than not, program configuration or places in static files need to be substituted by user-provided values. E.g. the `LOG_LEVEL` of a runtime service or the `REPO_URL` for links in Markdown files. Therefore the CLI parses all static files it synchronizes and substitutes all occurrences of values that match the following expression and are a defined variable: `${{ variableName }}`. For invoked programs, all defined variables are exposed as ENV variables for the program to use. See the [variables feature](./docs/features/VARIABLES.md) for details.

# Getting started

The CLI manages packages - each of which is simply a git repository with a `manifest.json` at its root. There is no central package registry. Any git repository can be referenced as a package. The ones currently maintained by the Eclipse Velocitas team can be found [here](https://github.com/eclipse-velocitas/?q=devenv).

When starting a new project from scratch, use the command `velocitas init`. This command will create a fresh `.velocitas.json` inside the current working directory with a few default packages already referenced and download. Feel free to adjust these packages to suite your needs.

If you use one of our [template repositories](https://github.com/eclipse-velocitas/?type=template) to kick-start your project, your project already comes with a `.velocitas.json`. Check out the repo and execute `velocitas init` in your new repository. This will download and initialize all referenced packages.

Should one of your packages provide files to be synchronized into your repository, call `velocitas sync` to synchronize files. **Warning:** This will overwrite any changes you have made to the files manually! Affected files are prefixed with an auto generated notice:

```
This file is maintained by velocitas CLI, do not modify manually. Change settings in .velocitas.json
```

## Prerequisites

> **_NOTE:_** The CLI has not been tested outside of our devcontainer base images. However, when using the Velocitas CLI outside of the mentioned image the following software/tools are needed:

- OS Recommendation is e.g. Ubuntu >= 22.04
- python3 (If not default in your environment create a symlink or use `python-is-python3`)
- `wget`, `build-essential`, `glibc`, `git` need to be installed

## Project configuration

An exemplary project configuration (`.velocitas.json`) looks like this:

```json
{
  "packages": {
      "package-A": "v1.0.0",
      "package-B": "v2.3.1-dev"
  },
  "components": [ "component-A", "component-B" ],
  "variables": {
    "repoUrl": "https://github.com/eclipse-velocitas/cli",
    "copyrightYear": 2023,
    "autoGenerateVehicleModel": true,
    "variableA@package-A": "variableA",
    "variableB@component-B": "variableB",
  }
}
```

As mentioned previously, a package simply is a git repository. The key inside the packages is used to identify the git repository which holds the package. It is currently resolved to `https://github.com/eclipse-velocitas/<name>`. Alternatively, you can also supply a fully qualified Git repo URL e.g. `https://<your-host>/<your-repo>.git` or `git@<your-host>/<your-repo>.git`. Credentials for HTTPs and SSH based git repos are provided by your local git configuration (CLI is using Git under the hood). The value of the package attribute specifies a tag, a branch or a SHA of the repository.

The `variables` block holds configured values for a specific scope (project, package or component). A variable without separator acts as a global variable. Should two components share the same variable name, both can be set with one line in this global block. Package-wide or component-wide variable configuration can be used to avoid name clashes. For a package or component scope the variable needs to be assigned with an '@' followed by either package or component ID. In the example above, `variableA@package-A` and `variableB@component-B` showcase such a usage.

Click [here](./docs/PROJECT-CONFIG.md) for an in-depth overview of the project configuration.

# Commands
<!-- commands -->
* [`velocitas cache clear`](#velocitas-cache-clear)
* [`velocitas cache get [KEY]`](#velocitas-cache-get-key)
* [`velocitas cache set KEY VALUE`](#velocitas-cache-set-key-value)
* [`velocitas component add ID`](#velocitas-component-add-id)
* [`velocitas component list`](#velocitas-component-list)
* [`velocitas component remove ID`](#velocitas-component-remove-id)
* [`velocitas create`](#velocitas-create)
* [`velocitas exec COMPONENT REF [ARGS...]`](#velocitas-exec-component-ref-args)
* [`velocitas help [COMMANDS]`](#velocitas-help-commands)
* [`velocitas init`](#velocitas-init)
* [`velocitas package [NAME]`](#velocitas-package-name)
* [`velocitas sync`](#velocitas-sync)
* [`velocitas upgrade`](#velocitas-upgrade)

## `velocitas cache clear`

Clean a project's cache.

```
USAGE
  $ velocitas cache clear

DESCRIPTION
  Clean a project's cache.

EXAMPLES
  $ velocitas cache clear
```

_See code: [src/commands/cache/clear.ts](src/commands/cache/clear.ts)_

## `velocitas cache get [KEY]`

Get the complete cache contents as JSON string or the value of a single key.

```
USAGE
  $ velocitas cache get [KEY]

ARGUMENTS
  KEY  The key of a single cache entry to get.

DESCRIPTION
  Get the complete cache contents as JSON string or the value of a single key.

EXAMPLES
  $ velocitas cache get
  {"foo":"bar"}

  $ velocitas cache get foo
  bar
```

_See code: [src/commands/cache/get.ts](src/commands/cache/get.ts)_

## `velocitas cache set KEY VALUE`

Set the cache value of an entry.

```
USAGE
  $ velocitas cache set KEY VALUE

ARGUMENTS
  KEY    The cache key to set
  VALUE  The value to set for the cache key

DESCRIPTION
  Set the cache value of an entry.

EXAMPLES
  $ velocitas cache set <key> <value>
```

_See code: [src/commands/cache/set.ts](src/commands/cache/set.ts)_

## `velocitas component add ID`

Add project components.

```
USAGE
  $ velocitas component add ID

ARGUMENTS
  ID  ID of the component to add

DESCRIPTION
  Add project components.

EXAMPLES
  $ velocitas component add <id>
```

_See code: [src/commands/component/add.ts](src/commands/component/add.ts)_

## `velocitas component list`

List project components.

```
USAGE
  $ velocitas component list [-a | -u]

FLAGS
  -a, --all     Shows all components
  -u, --unused  Shows unused components

DESCRIPTION
  List project components.

EXAMPLES
  $ velocitas component list
```

_See code: [src/commands/component/list.ts](src/commands/component/list.ts)_

## `velocitas component remove ID`

Remove project components.

```
USAGE
  $ velocitas component remove ID

ARGUMENTS
  ID  ID of the component to add

DESCRIPTION
  Remove project components.

EXAMPLES
  $ velocitas component remove <id>
```

_See code: [src/commands/component/remove.ts](src/commands/component/remove.ts)_

## `velocitas create`

Create a new Velocitas Vehicle App project.

```
USAGE
  $ velocitas create [-n <value>] [-c <value>] [-e <value>] [-i <value>]

FLAGS
  -c, --core=<value>          Which core to use for the project.
  -e, --example=<value>       Use an example upon which to base your Vehicle App.
  -i, --interface=<value>...  Functional interface your Vehicle App should use.
  -n, --name=<value>          Name of the Vehicle App.

DESCRIPTION
  Create a new Velocitas Vehicle App project.

EXAMPLES
  $ velocitas create -n VApp -c vapp-core-python ...
          Creating a new Velocitas project ...
```

_See code: [src/commands/create/index.ts](src/commands/create/index.ts)_

## `velocitas exec COMPONENT REF [ARGS...]`

Executes a script contained in one of your installed components.

```
USAGE
  $ velocitas exec COMPONENT REF [ARGS...] [-v]

ARGUMENTS
  COMPONENT  The component which provides the program
  REF        Reference to the ID of the program to execute
  ARGS...    Args for the executed program. All arguments and flags provided after the ref are forwarded to the invoked
             program.

FLAGS
  -v, --verbose  Enable verbose logging. The flag may be provided before or in between the 2 positional arguments of
                 exec. Providing the flag after the 2nd positional argument will forward the flag to the invoked
                 program.

DESCRIPTION
  Executes a script contained in one of your installed components.

EXAMPLES
  $ velocitas exec runtime-local up
  Executing script...
```

_See code: [src/commands/exec/index.ts](src/commands/exec/index.ts)_

## `velocitas help [COMMANDS]`

Display help for velocitas.

```
USAGE
  $ velocitas help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for velocitas.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.20/src/commands/help.ts)_

## `velocitas init`

Initializes Velocitas Vehicle App

```
USAGE
  $ velocitas init [-v] [-f] [--no-hooks]

FLAGS
  -f, --force    Force (re-)download packages
  -v, --verbose  Enable verbose logging
  --no-hooks     Skip post init hooks

DESCRIPTION
  Initializes Velocitas Vehicle App

EXAMPLES
  $ velocitas init
  Initializing Velocitas packages ...
  ... Downloading package: 'pkg-velocitas-main:vx.x.x'
  ... Downloading package: 'devenv-devcontainer-setup:vx.x.x'
  ... Downloading package: 'devenv-runtimes:vx.x.x'
  ... Downloading package: 'devenv-github-templates:vx.x.x'
  ... Downloading package: 'devenv-github-workflows:vx.x.x'
```

_See code: [src/commands/init/index.ts](src/commands/init/index.ts)_

## `velocitas package [NAME]`

Prints information about packages

```
USAGE
  $ velocitas package [NAME] [-p]

ARGUMENTS
  NAME  Name of the package

FLAGS
  -p, --getPath  Print the path of the package

DESCRIPTION
  Prints information about packages

EXAMPLES
  $ velocitas package devenv-runtimes
  devenv-runtimes:
    version: v3.0.0
    components:
      - id: runtime-local
        variables:
        - runtimeFilePath:
            type: string
            description: "Path to the file describing your custom runtime configuration."
            required: false
            default: runtime.json
  $ velocitas package --get-path devenv-runtimes
  /home/vscode/.velocitas/packages/devenv-runtimes/v3.0.0
```

_See code: [src/commands/package/index.ts](src/commands/package/index.ts)_

## `velocitas sync`

Syncs Velocitas components into your repo.

```
USAGE
  $ velocitas sync

DESCRIPTION
  Syncs Velocitas components into your repo.

EXAMPLES
  $ velocitas sync
  Syncing Velocitas components!
  ... syncing 'github-workflows'
  ... syncing 'github-templates'
```

_See code: [src/commands/sync/index.ts](src/commands/sync/index.ts)_

## `velocitas upgrade`

Updates Velocitas components.

```
USAGE
  $ velocitas upgrade [--dry-run] [--ignore-bounds] [--init] [-v]

FLAGS
  -v, --verbose    Enable verbose logging
  --dry-run        Check which packages can be upgraded
  --ignore-bounds  Ignores specified version ranges and will result in upgrading to the latest available semantic version
  --init           Initializes components after upgrading them.

DESCRIPTION
  Updates Velocitas components.

EXAMPLES
  $ velocitas upgrade
  Checking .velocitas.json for updates!
  ... pkg-velocitas-main:vx.x.x → up to date!
  ... devenv-devcontainer-setup:vx.x.x → up to date!
  ... devenv-runtimes:vx.x.x → vx.x.x
  ... devenv-github-templates:vx.x.x → up to date!
  ... devenv-github-workflows:vx.x.x → up to date!
```

_See code: [src/commands/upgrade/index.ts](src/commands/upgrade/index.ts)_
<!-- commandsstop -->

# Installation

**Prerequisites**
* NodeJS >= 20
* NPM
* Linux environment (others may work, but are untested)

## Obtaining prebuilt binaries

You can obtain prebuilt binaries of the CLI which have no dependency to NodeJS. These can be found [here](https://github.com/eclipse-velocitas/cli/releases).
Currently we are supporting only linux `arm64` and `x64` architecture.
Velocitas CLI is already pre-intalled within our [devcontainer-base-image](https://github.com/eclipse-velocitas/devcontainer-base-images).

If you need to install it on custom setup, please use follow, where `<version_tag>` any released tag version, e.g. `v0.5.5`, and `<arch>` - architecture type, e.g. `arm64` or `x64`:
```
curl -L https://github.com/eclipse-velocitas/cli/releases/download/<version_tag>/velocitas-linux-<arch> -o /usr/bin/velocitas
chmod -x /usr/bin/velocitas
```

# Configuration
## Changing default VELOCITAS_HOME directory

* `VELOCITAS_HOME` specifing this env variable will output all velocitas related data to `$VELOCITAS_HOME/.velocitas` instead of `$userHome/.velocitas`.
# Advanced topics

* [Package development](./docs/features/PACKAGES.md)
* [Variables](./docs/features/VARIABLES.md)
* [Project cache](./docs/features/PROJECT-CACHE.md)

# Contribution
- [GitHub Issues](https://github.com/eclipse-velocitas/cli/issues)
- [Mailing List](https://accounts.eclipse.org/mailing-list/velocitas-dev)
- [Contribution](CONTRIBUTING.md)
