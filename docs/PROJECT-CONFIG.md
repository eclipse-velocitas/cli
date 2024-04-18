# Project configuration

The project configuration describes which packages your project is using and in which version. The versions of the referenced packages can be upgraded using the `upgrade` command. If you only want to see which new versions are available use `upgrade --dry-run` or `upgrade --dry-run --ignore-bounds`. Each package may expose variables which need to be set from the project configuration. If multiple different packages all expose the same named variable `foo`, setting this variable once in the project configuration will pass the value to all packages. If a package or even a component exposes a variable which is only needed within its scope it can be set with `"variableA@package-A": "variableA"`.

Read more about variables [here](./features/VARIABLES.md).

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

## Components

A package always exposes 1 to n *components* each of which should provide distinct functionality, i.e. to set up a devContainer or to integrate with Github.

By default, all components of a package will be used, but if desired the used components can be filtered. By providing a list of component configurations in the project configuration:

```json
{
  "packages": {
      "package-A": "v1.0.0",
      "package-B": "v2.3.1-dev"
  },
  "components": [ "component-exposed-by-pkg-a", "component-exposed-by-pkg-b" ],
  "variables": {
    "repoUrl": "https://github.com/eclipse-velocitas/cli",
    "copyrightYear": 2023,
    "autoGenerateVehicleModel": true
  }
}
```

The project above will only use the components `component-exposed-by-pkg-a` and `component-exposed-by-pkg-b`, ignoring any other components exposed by the packages.

## File Structure

### `packages` - Map[string, string]

A key-value configuration of packages, where key is the package [repo](#repo) and value is the [version](#version).

### `components` - string[]

An array of used components.

### `variables` - Map[string, any]

Project-wide key-value [variable](#variables) configuration.

# Types

## `repo`

The name of the package or URL to the package git repository. A simple name is currently resolved to `https://github.com/eclipse-velocitas/<name>`. Alternatively, you can also supply a fully qualified Git repo URL e.g. `https://<your-host>/<your-repo>.git` or `git@<your-host>/<your-repo>.git`. Credentials for HTTPs and SSH based git repos are provided by your local git configuration (CLI is using Git under the hood).

## `version`

The version of the package to use.
| Literal | Behaviour | Example |
|---------|-----------|---------|
| valid semantic version range | [Follows semantic versioning](https://semver.org/) with [ranges](https://www.npmjs.com/package/semver#ranges) | `"v1.0.*", "~v1.0.0", "^v1.0.0", "v1"` |
| tag | Refers to a specific tagged version | `"v1.0.0"` |
| branch (prefixed with an '@') | Refers to the latest commit in a specific branch | `"@main"` |
| latest | Refers to the latest tag if available else to the highest version tag | `"latest"` |

## `variables`

| Scope | Example |
|-------|---------|
| Global | `"projectVariable": "A project wide variable"` |
| Package | `"packageVariable@pkg-a": "A package wide variable"` |
| Component | `"componentVariable@component-exposed-by-pkg-a": "A component wide variable"` |
