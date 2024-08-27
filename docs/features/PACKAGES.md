# Packages and components

Packages managed by the CLI are simply git repositories with a `manifest.json` at their root.

The manifest simply contains one field called `components` which holds a list of all components located inside of the package.

Example:
```json
{
    "components": [
        {
            "id": "component-A"
            ...
        },
        {
            "id": "component-B"
            ...
        }
    ]
}

```

# Component

A component is a collection of programs or files that serve a similar purpose or are inheritly connected. I.e. they provide a single runtime, a deployment for a runtime or add workflows required for Github.

```json
{
    "id": "component-A",
    "files": [
        {
            "src": "./src/github/workflows",
            "dst": ".github/workflows"
        }
    ],
    "programs": [

    ]
}
```

## `id` - string

The unique identifier of the component. Must be unique across **all** installed packages.

## `files` - Array[[`FileSpec`](#filespec)]

A list of file specifications to copy from the component to the project when calling the `sync` command.

## `programs` - Array[[`ProgramSpec`](#programspec)]

List of all programs exposed by the component.

## `onPostInit` - Array[[`ExecSpec`](#execspec)]

List of program references to be executed in-order after the component has been initialized.

## `variables` - Array[[`VariableDefinition`](#variabledefinition)]

List of variables exposed by this component.

# Types
## `FileSpec`

Specifies what to copy where when executing `sync`.

A file specification looks like this:
```json
{
    "src": "<source_path>",
    "dst": "<destionation_path>",
    "condition": "${{ foo }} === 'bar'"
}
```

### `src` - string

The source path of the file or directory to copy, relative to the repository root of the package repo. Supports in-string variable replacements.

### `dst` - string

The destination path of the file or directory to copy to, relative to the _Velocitas_ project's workspace. Supports in-string variable replacements.

### `condition` - string

An optional condition. Can be omitted to always copy the file(s). Needs to be a valid JavaScript condition expression. Supports in-string variable replacements.

Examples:
* Always copy all files from `<package_repo>/my_sync_files` to `<project_dir>/.github`:
```json
{
    "src": "./my_sync_files",
    "dst": "./.github"
}
```
* Conditionally copy all files from `<package_repo>/python_files` to `<project_dir>/`, if the project variable `language` is set to the string value `python`:
```json
{
    "src": "./python_files",
    "dst": ".",
    "condition": "${{ language }} === 'python'"
}
```
* Copy all files from the configured language directory `<package_repo>/${{ language }}_files` to `<project_dir>/`:
```json
{
    "src": "./${{ language }}_files",
    "dst": "."
}
```

## `ProgramSpec`

Specifies a program exposed by a component and its default parameters when invoked without arguments.

```json
{
    "id": "my-program",
    "executable": "./src/my_script.sh",
    "args": ["hello", "world"]
}
```

**Note:** If the `executable` is `python[3]` (or `pip[3]`) the execution of the Python program is automatically done
within a [Python venv (virtual environment)](https://docs.python.org/3/tutorial/venv.html) specific to the component.
I.e. the CLI will setup a separate venv per component. All Python programs of that component will be executed within
that "component's" virtual environment. With this separation of execution environments it is possible to handle
different versions of depenencies per component without generating version conflicts.

This automatism can be avoided by specifying the Python interpreter explicitly, e.g. by using an absolute path like
`/usr/bin/python`.

Other Python processes spawned from a Python-based program will **not** be automatically executed in a Python venv.
(Because the dependencies of that scripts will probably differ from those of the calling program's component.)

### `id` - string

Unique ID within this component to identify the program.

### `executable` - string

Either a relative path from the package's repository root to a script to execute (i.e. a Bash script) or a program reference available in the system (i.e. `python3` or `/usr/lib/python3`)

### `args` - Array[string]

A list of default arguments when invoking the program without parameters. This is required for Python scripts where `executable` will be just `python` and the first argument needs to be the path to the script.

### `interactive` - boolean

A flag to specify if the exposed program is interactive.

## `ExecSpec`

An execution specification for one of the exposed programs via [`ProgramSpec`](#programspec). Used to invoke programs by the CLI when **not** using the `exec` command.

```json
{
    "ref": "my-program",
    "args": ["hello", "world"]
}
```

### `ref` - string

Reference to the program spec to invoke.

### `args` - Array[string]

A list of arguments which overwrite the arguments in `ProgramSpec.args`.

## `VariableDefinition`

Defines a variable exposed by a component.

```json
{
    "name": "repoUrl",
    "description": "The URL of the remote repository of this vehicle app.",
    "type": "string"
}
```

### `name` - string

The name of the variable.

### `description` - string

A description of the meaning of the variable.

### `type` - string

The type name of the variable. May be any valid JavaScript type.

### `default`: any?

Optional default value. If the default is omitted, the require becomes a required variable.
