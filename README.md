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
| `base` | Every project | 2 spaces, 200 columns, single quotes, semicolons, trailing commas, recommended lint rules, organized imports (sorted, `import type` for type-only imports via `useImportType`), `.gitignore` aware. Errors on `any`, unused imports and variables, bare (non-`node:`) built-in imports, missing curly braces (`useBlockStatements`), default parameters that aren't last, non-last `default` switch clauses, and non-camelCase names (`useNamingConvention`). Relaxes `noExplicitAny` and `noNonNullAssertion` in test files. |
| `lib` | Published packages and CLIs | Errors on default exports and `export *`. Config files (`*.config.*`) and test files are exempt from the default-export rule. |
| `react` | React apps and component libraries | Enables the Biome React domain, sets hook rules (`useExhaustiveDependencies`, `useHookAtTopLevel`) to errors, and uses double quotes in JSX. |

> ESLint's `func-names: always` and `arrow-body-style: always` have no Biome equivalent, so they are intentionally not mapped.

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
