# Variables

The CLI exposes variables to files copied via the `files` entry in a component manifest, the `condition` field of a file specification inside of the `files` entry and programs executed via the `exec` command. These variables are either built-in or are exposed by your project's components located in your project's packages.

Which variables are available from your packages can be viewed by either the `packages` command which lists all of your installed packages and their exposed variables or the.

---

<p style="color:red;">
<strong>Notice:</strong> Variables exposed by a component are only valid within the scope of that component! In more practical terms: If you have a component A which exposes a string variable <i>hello</i>, <i>hello</i> will not be available to any files or programs exposed by component B.
</p>

---

## Built-in variables

| Name | Example | Description |
|:-----|:--------|:------------|
| `VELOCITAS_WORKSPACE_DIR` | `/workspaces/vehicle-app-cpp-template` | Absolute path to the workspace of the current project. |
| `VELOCITAS_CACHE_DATA` | `{ "my_key": "my_value", "foo": 5, "bar": "baz" }` |Holds the entire cache data as JSON-string. It is up to the programs to decide which keys they want to access. |
| `VELOCITAS_CACHE_DIR` |    `/home/vscode/.velocitas/projects/dc6cefc9655021ae1be77a452b9367ab` | Absolute path to the project's cache directory. Can be used to store temporary files for the project. |
| `VELOCITAS_APP_MANIFEST` | `{ "name": "SeatAdjuster", "Dockerfile": "./app/Dockerfile" }` | The contents of your VehicleApp's AppManifest as a JSON string.
