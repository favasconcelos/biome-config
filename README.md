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

| Preset | Use it for |
|---|---|
| `base` | Every project: house formatter, strict lint rules, sorted imports, `.gitignore` aware. |
| `lib` | Published packages and CLIs: named exports only, no `export *` barrels. |
| `react` | React apps and component libraries: React domain rules, double quotes in JSX. |

Full list of every rule and setting: [docs/rules.md](docs/rules.md).

## Overriding

Anything you write after `extends` takes precedence:

```json
{
  "extends": ["@favasconcelos/biome-config/base", "@favasconcelos/biome-config/lib"],
  "linter": {
    "rules": {
      "suspicious": { "noConsole": "warn" }
    }
  }
}
```

## Notes

- `base` enables `vcs.useIgnoreFile`, so Biome needs a `.gitignore` in your project root.
- Paths in a shared config, such as `overrides[].includes`, are resolved from the project that extends it.

## License

[MIT](LICENSE)
