# @favasconcelos/biome-config

[![npm](https://img.shields.io/npm/v/@favasconcelos/biome-config)](https://www.npmjs.com/package/@favasconcelos/biome-config)
[![CI](https://img.shields.io/github/actions/workflow/status/favasconcelos/biome-config/ci.yml?branch=main&label=CI)](https://github.com/favasconcelos/biome-config/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@favasconcelos/biome-config)](LICENSE)

Shared [Biome](https://biomejs.dev) configuration, split into small presets you stack on top of each other.

## Install

```sh
npm install --save-dev --save-exact @biomejs/biome @favasconcelos/biome-config
```

Requires Biome 2.5+.

## Usage

Create a `biome.json` that extends the presets you need:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["@favasconcelos/biome-config/base"]
}
```

Presets are layers. Biome merges `extends` left to right, so later presets win over earlier ones, and
anything in your own `biome.json` wins over all of them. Always list `base` first:

```json
{ "extends": ["@favasconcelos/biome-config/base", "@favasconcelos/biome-config/lib"] }
```

```json
{ "extends": ["@favasconcelos/biome-config/base", "@favasconcelos/biome-config/react"] }
```

A shared config cannot extend another one: Biome silently ignores a nested `extends`. That is why presets
don't chain each other and you stack them yourself.

## Presets

| Preset | Use it for | What it adds |
|---|---|---|
| `base` | Every project | 2 spaces, 100 columns, single quotes, no semicolons, trailing commas, recommended lint rules, organized imports, `.gitignore` aware. Relaxes `noExplicitAny` and `noNonNullAssertion` in test files. |
| `lib` | Published packages and CLIs | Errors on `any`, default exports, `export *`, unused imports and variables, and imports of Node built-ins without `node:`. Warns on `console`. Config files (`*.config.*`) and test files are exempt where it makes sense. |
| `react` | React apps and component libraries | Enables the Biome React domain, sets hook rules (`useExhaustiveDependencies`, `useHookAtTopLevel`) to errors, and uses double quotes in JSX. |

## Overriding

Anything you write after `extends` takes precedence:

```json
{
  "extends": ["@favasconcelos/biome-config/base", "@favasconcelos/biome-config/lib"],
  "linter": {
    "rules": {
      "suspicious": { "noConsole": "off" }
    }
  }
}
```

## Notes

- `base` enables `vcs.useIgnoreFile`, so Biome needs a `.gitignore` in your project root.
- Paths in a shared config, such as `overrides[].includes`, are resolved from the project that extends it.

## Releasing

Releases are published to npm by [`release.yml`](.github/workflows/release.yml) using
[trusted publishing](https://docs.npmjs.com/trusted-publishers) (no tokens).

1. Bump `version` in `package.json` and commit it as `chore(release): x.y.z`.
2. Publish a GitHub Release with the tag `vx.y.z`. The workflow checks that the tag matches `package.json`.
3. Pre-releases (`v1.0.0-beta.1`) are published under the `next` dist-tag, stable ones under `latest`.

Stricter lint rules can break consumers' builds, so a preset change that adds rules is at least a minor
release, and a major one if it is likely to fail existing projects.

## License

[MIT](LICENSE)
