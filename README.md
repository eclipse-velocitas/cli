# velocitas-cli

[![License: Apache](https://img.shields.io/badge/License-Apache-yellow.svg)](http://www.apache.org/licenses/LICENSE-2.0)

Velocitas CLI
=================
The CLI implements the [lifecyle management](link-to-velocitas-docs) concept of the development environment of
a Vehicle App.

It allows *us* to take care of the development environment while *you* focus on the business logic of your vehicle application. 


# Contents

<!-- toc -->
* [Contents](#contents)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage
<!-- usage -->
```sh-session
$ npm install -g velocitas-cli
$ velocitas COMMAND
running command...
$ velocitas --version
velocitas-cli/0.1.0 darwin-x64 node-v18.12.1
$ velocitas --help [COMMAND]
USAGE
  $ velocitas COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
<!-- no toc -->
- [`exec COMPONENT ID [ARGS]`](#velocitas-exec-component-id-args)
- [`help [COMMAND]`](#velocitas-help-command)
- [`init`](#velocitas-init)
- [`package [NAME]`](#velocitas-package-name)
- [`sync`](#velocitas-sync)
- [`upgrade`](#velocitas-upgrade)

## `velocitas exec COMPONENT ID [ARGS]`

Executes a script contained in one of your installed components.

```
USAGE
  $ velocitas exec [COMPONENT] [ID] [ARGS] [--args <value>]

ARGUMENTS
  COMPONENT  The component which provides the program
  ID         ID of the program to execute
  ARGS       Additional arguments for the program

FLAGS
  --args=<value>  Args for the executed program

DESCRIPTION
  Executes a script contained in one of your installed components.

EXAMPLES
  $ velocitas exec devenv-runtime-local src/run-mosquitto.sh
  Executing script...
```

_See code: [dist/commands/exec/index.ts](./src/commands/exec/index.ts)_

## `velocitas help [COMMAND]`

Display help for velocitas.

```
USAGE
  $ velocitas help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for velocitas.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.19/src/commands/help.ts)_

## `velocitas init`

Initializes Velocitas Vehicle App

```
USAGE
  $ velocitas init

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

_See code: [dist/commands/init/index.ts](./src/commands/init/index.ts)_

## `velocitas package [NAME]`

Prints information about components

```
USAGE
  $ velocitas package [NAME] [-p]

ARGUMENTS
  NAME  Name of the package

FLAGS
  -p, --getPath  Print the path of the package

DESCRIPTION
  Prints information about components

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

_See code: [dist/commands/package/index.ts](./src/commands/package/index.ts)_

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

_See code: [dist/commands/sync/index.ts](./src/commands/sync/index.ts)_

## `velocitas upgrade`

Upgrade Velocitas components.

```
USAGE
  $ velocitas upgrade [--dry-run]

FLAGS
  --dry-run  Check which components can be updated

DESCRIPTION
  Upgrades Velocitas components.

EXAMPLES
  $ velocitas upgrade
  Checking for updates!
  ... 'devenv-runtime-local' is up to date!
  ... 'devenv-runtime-k3d' is up to date!
  ... 'devenv-github-workflows' is up to date!
  ... 'devenv-github-templates' is up to date!
```

_See code: [dist/commands/upgrade/index.ts](./src/commands/update/index.ts)_
<!-- commandsstop -->

## Contribution
- [GitHub Issues](https://github.com/eclipse-velocitas/velocitas-cli/issues)
- [Mailing List](https://accounts.eclipse.org/mailing-list/velocitas-dev)
- [Contribution](https://eclipse-velocitas.github.io/velocitas-docs/docs/contribution/)
