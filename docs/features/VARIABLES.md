# Variables

The CLI exposes variables to files copied via the `files` entry in a component manifest, the `condition` field of a file specification inside of the `files` entry and programs executed via the `exec` command. These variables are either built-in or are exposed by your project's components located in your project's packages.

Which variables are available from your packages can be viewed by the `packages` command which lists all of your installed packages and their exposed variables.

## Variable scopes

| Scope identifier | Validity |
|:-----------------|:--------|
| `component` (default) | Variable is valid only within the same toolchain component. |
| `package` | Variable is valid within the same toolchain component and all of the components within the same package. Allows sharing of information within a package (e.g. a version identifier). |
| `project` | Variable is valid within all toolchain components of the project. This allows toolchain components of type `core` to share information with all of it's `extensions`, for example a programming language or a configuration. |

## Built-in variables

| Name | Example | Description |
|:-----|:--------|:------------|
| `VELOCITAS_WORKSPACE_DIR` | `/workspaces/vehicle-app-cpp-template` | Absolute path to the workspace of the current project. |
| `VELOCITAS_CACHE_DATA` | `{ "my_key": "my_value", "foo": 5, "bar": "baz" }` |Holds the entire cache data as JSON-string. It is up to the programs to decide which keys they want to access. |
| `VELOCITAS_CACHE_DIR` |    `/home/vscode/.velocitas/projects/dc6cefc9655021ae1be77a452b9367ab` | Absolute path to the project's cache directory. Can be used to store temporary files for the project. |
| `VELOCITAS_APP_MANIFEST` | `{ "name": "SeatAdjuster", "Dockerfile": "./app/Dockerfile" }` | The contents of your VehicleApp's AppManifest as a JSON string.
