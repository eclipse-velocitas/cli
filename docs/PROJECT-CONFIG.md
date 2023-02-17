# Project configuration

```json
{
  "packages": [
    {
      "name": "package-A",
      "version": "v1.0.0"
    },
    {
      "name": "package-B",
      "version": "v2.3.1-dev"
    }
  ],
  "variables": {
    "repoUrl": "https://github.com/eclipse-velocitas/cli",
    "copyrightYear": 2023,
    "autoGenerateVehicleModel": true
  }
}
```

### `packages` - Array[[`PackageConfig`](#packageconfig)]

Array of packages used in the project.

### `variables` - Map[string, any]

Project-wide key-value variable configuration.

# Types

## `PackageConfig`

### `name` - string

The name of the package or URL to the package git repository. This field is currently resolved to `https://github.com/eclipse-velocitas/<name>`. In a future feature addition, we will allow arbitrary git repository URLs in the name field

### `version` - string

The version of the package to use. May be a tag, branch or SHA.

### `variables` - Map[string, any]

Package-wide variable configuration.

### `components` - Array[[`ComponentConfig`](#componentconfig)]

Per-component configuration.

## `ComponentConfig`

### `id` - string

Unique ID of the component within the package.

### `variables` - Map[string, any]

Component-wide key-value variable configuration
