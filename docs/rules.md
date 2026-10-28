# Preset rules

Every setting each preset enables, and why. All lint rules below are set to `error`.

## `base` — every project

### Formatter

- 2 spaces, 180 columns.
- JavaScript: single quotes, semicolons always, trailing commas everywhere, arrow parentheses
  always (`() =>`), `{ a: 1 }` bracket spacing, JSX brackets on their own line.
- JSON: 2 spaces, `{ a: 1 }` bracket spacing, no trailing commas.

### Linter (on top of Biome's `recommended` preset)

| Rule                                    | Why                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `suspicious.noExplicitAny`              | `any` defeats type checking; use `unknown` and narrow it.                              |
| `suspicious.useDefaultSwitchClauseLast` | The `default` clause belongs last in a `switch` (ESLint `default-case-last`).          |
| `style.useBlockStatements`              | Always use braces for control bodies (ESLint `curly: all`).                            |
| `style.useDefaultParameterLast`         | Defaulted parameters must come last (ESLint `default-param-last`).                     |
| `style.useImportType`                   | Type-only imports must use `import type`, so import sorting stays consistent.          |
| `style.useNamingConvention`             | `camelCase` variables/functions, `PascalCase` classes/components (ESLint `camelcase`). |
| `style.useNodejsImportProtocol`         | Built-in modules must use the `node:` protocol (`node:fs`, not `fs`).                  |
| `correctness.noUnusedImports`           | Dead imports fail the build instead of rotting.                                        |
| `correctness.noUnusedVariables`         | Same for dead variables.                                                               |

### Assist

- `source.organizeImports`: sorts, merges, and de-duplicates imports (runs as part of
  `biome check`). Groups, separated by a blank line: Node built-ins and packages, then aliases,
  then relative paths.
- `source.useSortedKeys`: sorts object keys (JS and JSON).
- `source.useSortedAttributes`: sorts JSX attributes.
- `source.useSortedProperties`: sorts CSS properties.

### Overrides

- `package.json` and `package-lock.json`: `useSortedKeys` is off, so npm's own key order is kept.
- Test files (`*.test.*`, `*.spec.*`, `test/`, `tests/`, `__tests__/`): `noExplicitAny` and
  `noNonNullAssertion` are off — tests are allowed looser typing.

### VCS

- Respects `.gitignore` (`vcs.useIgnoreFile`), so Biome needs a `.gitignore` in the project root.

## `lib` — published packages and CLIs

| Rule                        | Why                                                            |
| --------------------------- | -------------------------------------------------------------- |
| `style.noDefaultExport`     | Named exports keep public APIs greppable and refactoring-safe. |
| `performance.noReExportAll` | `export *` barrels hurt tree-shaking and hide the public API.  |

### Overrides

- Config files (`*.config.*`) and type declarations (`*.d.ts`): `noDefaultExport` is off —
  config files conventionally use a default export.
- Test files (same patterns as `base`): `noDefaultExport` is off.

## `react` — React apps and component libraries

| Setting                                      | Why                                              |
| -------------------------------------------- | ------------------------------------------------ |
| `domains.react: recommended`                 | Enables the React domain rules.                  |
| `correctness.useExhaustiveDependencies`      | Effect dependencies must be complete.            |
| `correctness.useHookAtTopLevel`              | Hooks must run unconditionally at the top level. |
| `javascript.formatter.jsxQuoteStyle: double` | `<div className="x">` — double quotes in JSX.    |

## `tailwind` — Tailwind projects (requires Biome 2.6+)

All Tailwind configuration lives here; no other preset contains Tailwind settings.

| Setting                               | Why                                                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `css.parser.tailwindDirectives: true` | Parses Tailwind v4 directives and functions (`@theme`, `@utility`, …) instead of flagging them as unknown at-rules.                                                                         |
| `nursery.noTailwindLegacyUtilities`   | Flags utility names Tailwind only keeps for backward compatibility (`flex-grow` → `grow`, `bg-gradient-to-*` → `bg-linear-to-*`), with a safe fix. Nursery group: experimental, may change. |
