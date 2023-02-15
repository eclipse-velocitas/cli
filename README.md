Velocitas CLI - The package manager for your project
=================================

[![CI Workflow](https://github.com/eclipse-velocitas/cli/actions/workflows/ci.yml/badge.svg#branch=main)](https://github.com/eclipse-velocitas/cli/actions/workflows/ci.yml)
[![License: Apache](https://img.shields.io/badge/License-Apache-yellow.svg)](http://www.apache.org/licenses/LICENSE-2.0)

<!-- toc -->
* [Introduction](#introduction)
* [Commands](#commands)
* [Installation](#installation)
* [Configuration](#configuration)
* [Features](#features)
* [Contribution](#contribution)
<!-- tocstop -->

# Introduction

The CLI implements the [lifecyle management](link-to-velocitas-docs) concept of the development environment of
a Vehicle App.

It allows *us* to take care of the development environment while *you* focus on the business logic of your vehicle application.

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

_See code: [dist/commands/package/index.ts](https://github.com/eclipse-velocitas/velocitas-cli/blob/v0.2.1/dist/commands/package/index.ts)_

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

_See code: [dist/commands/upgrade/index.ts](https://github.com/eclipse-velocitas/velocitas-cli/blob/v0.2.1/dist/commands/upgrade/index.ts)_
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
# Features

* [Variables](./docs/features/VARIABLES.md)
* [Project cache](./docs/features/PROJECT-CACHE.md)

# Contribution
- [GitHub Issues](https://github.com/eclipse-velocitas/cli/issues)
- [Mailing List](https://accounts.eclipse.org/mailing-list/velocitas-dev)
- [Contribution](https://eclipse-velocitas.github.io/velocitas-docs/docs/contribution/)
