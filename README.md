Velocitas CLI - The project manager for your Vehicle Apps
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

The CLI implements the [lifecyle management](link-to-velocitas-docs) concept of the development environment of
a Vehicle App.

It allows *us* to take care of the development environment while *you* focus on the business logic of your vehicle application.

# Problem

Once created from either template or any other means of project creation, your new _Vehicle App_ repository is in isolation. It contains much more than just your app's source code - things you ideally do not want to worry about (i.e. CI/CD workflows, runtimes, build systems, devContainer configuration, ...). Pulling in changes from the mainline without breaking your custom changes is tedious and error prone. Moreover there are no mechanisms of getting notified about updates to the mainline that potentially fixes a bug or introduces a long sought for feature.

# Solution

This is where the CLI comes in - it manages everything in your repo which is not related to your _Vehicle App_'s source code as packages which are maintained by the _Velocitas_ team. The CLI allows you to download the latest versions and integrate the latest changes with ease.

It also comes on a mix and match basis: You need more than the native, default runtime? Simply add the kubernetes runtime to your project. Ever want to migrate from Github to Gitee? Simply switch packages.

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

# Commands
<!-- commands -->
* [`velocitas exec COMPONENT ID`](#velocitas-exec-component-id)
* [`velocitas help [COMMANDS]`](#velocitas-help-commands)
* [`velocitas init`](#velocitas-init)
* [`velocitas package [NAME]`](#velocitas-package-name)
* [`velocitas sync`](#velocitas-sync)
* [`velocitas upgrade`](#velocitas-upgrade)

## `velocitas exec COMPONENT ID`

Executes a script contained in one of your installed components.

```
USAGE
  $ velocitas exec [COMPONENT] [ID] [-v] [--args <value>]

ARGUMENTS
  COMPONENT  The component which provides the program
  ID         ID of the program to execute

FLAGS
  -v, --verbose   Enable verbose logging
  --args=<value>  Args for the executed program

DESCRIPTION
  Executes a script contained in one of your installed components.

EXAMPLES
  $ velocitas exec devenv-runtime-local src/run-mosquitto.sh
  Executing script...
```

_See code: [dist/commands/exec/index.ts](https://github.com/eclipse-velocitas/velocitas-cli/blob/v0.2.1/dist/commands/exec/index.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.1/src/commands/help.ts)_

## `velocitas init`

Initializes Velocitas Vehicle App

```
USAGE
  $ velocitas init [-v] [-f]

FLAGS
  -f, --force    Force (re-)download packages
  -v, --verbose  Enable verbose logging

DESCRIPTION
  Initializes Velocitas Vehicle App

EXAMPLES
  $ velocitas init
  Initializing Velocitas Vehicle App!
  Velocitas project found!
  ... 'devenv-runtime-local:v1.0.11' already initialized.
  ... 'devenv-runtime-k3d:v1.0.5' already initialized.
  ... 'devenv-github-workflows:v1.0.1' already initialized.
  ... 'devenv-github-templates:v1.0.1' already initialized.
```

_See code: [dist/commands/init/index.ts](https://github.com/eclipse-velocitas/velocitas-cli/blob/v0.2.1/dist/commands/init/index.ts)_

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
  $ velocitas package devenv-runtime-local
  devenv-runtime-local
      version: v1.0.12
      components:
            - id: runtime-local
              type: runtime
              variables:
                      name: myVar
                      type: string
                      description: some basic description
                      required: false
  $ velocitas component --get-path devenv-runtime-local
  /home/vscode/.velocitas/packages/devenv-runtime-local/v1.0.12
```

## `velocitas sync`

Syncs Velocitas components into your repo.

```
USAGE
  $ velocitas sync

DESCRIPTION
  Syncs Velocitas components into your repo.

EXAMPLES
  $ velocitas update MyAwesomeApp --lang cpp
  Syncing Velocitas components!
  ... syncing 'devenv-github-workflows'
  ... syncing 'devenv-github-templates'
```

_See code: [dist/commands/sync/index.ts](https://github.com/eclipse-velocitas/velocitas-cli/blob/v0.2.1/dist/commands/sync/index.ts)_

## `velocitas upgrade`

Updates Velocitas components.

```
USAGE
  $ velocitas upgrade [--dry-run] [-v]

FLAGS
  -v, --verbose  Enable verbose logging
  --dry-run      Check which packages can be upgraded

DESCRIPTION
  Updates Velocitas components.

EXAMPLES
  $ velocitas upgrade
  Checking for updates!
  ... 'devenv-runtime-local' is up to date!
  ... 'devenv-runtime-k3d' is up to date!
  ... 'devenv-github-workflows' is up to date!
  ... 'devenv-github-templates' is up to date!
```
<!-- commandsstop -->

# Installation

There are 2 ways to get ahold of the CLI.

## NPM

---

**Prerequisites**
* NodeJS >= 18
* NPM
* Linux environment (others may work, but are untested)

---

**Steps**
1. Clone this repo
2. cd into the cloned repo
3. Run the following command:

```sh-session
$ npm install -g velocitas-cli
```

## Obtaining prebuilt binaries

In case you do not want to install NodeJS on your system, you can obtain prebuilt binaries of the CLI which have no dependency to NodeJS. These can be found [here](https://github.com/eclipse-velocitas/cli/releases).

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
- [Contribution](https://eclipse-velocitas.github.io/velocitas-docs/docs/contribution/)
