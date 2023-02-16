# Packages and components

Packages managed by the CLI are simply git repositories with a `manifest.json` at their root.

The manifest simply contains one field called `components` which holds a list of all components located inside of the package.

Example:
```json
{
    "components": [
        {
            "id": "component-A"
        },
        {
            "id": "component-B"
        }
    ]
}

```

# Components

A single component inside of the `components` list of the package manifest has the following fields:

## `id` string
The unique identifier of the component. Must be unique across **all** installed packages.

## `files` list of file specifications
A list of file specifications to copy from the component to the project when calling the `sync` command.

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

## `programs` - list of program specification

## `onPostInit` - list of exec specs

## `onPostSync` - list of exec specs
