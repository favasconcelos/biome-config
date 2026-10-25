import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const biomeBin = join(root, 'node_modules', '.bin', 'biome')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const PRESETS = ['base', 'lib', 'react']

const tmpDirs = []
after(() => {
  for (const dir of tmpDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
})

// Builds a throwaway project that consumes this package from node_modules, like a real consumer.
function consumer({ presets, files }) {
  const dir = mkdtempSync(join(tmpdir(), 'biome-config-'))
  tmpDirs.push(dir)
  mkdirSync(join(dir, 'node_modules', '@favasconcelos'), { recursive: true })
  symlinkSync(root, join(dir, 'node_modules', '@favasconcelos', 'biome-config'), 'dir')
  writeFileSync(
    join(dir, 'biome.json'),
    JSON.stringify({ extends: presets.map((p) => `@favasconcelos/biome-config/${p}`) }, null, 2) +
      '\n',
  )
  writeFileSync(join(dir, '.gitignore'), 'node_modules\n')
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true })
    writeFileSync(join(dir, name), content)
  }
  return { path: dir, files }
}

function check(dir) {
  const targets = Object.keys(dir.files)
  const result = spawnSync(biomeBin, ['check', '--colors=off', ...targets], {
    cwd: dir.path,
    encoding: 'utf8',
  })
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` }
}

describe('package', () => {
  it('exports one parseable JSON file per preset', () => {
    for (const preset of PRESETS) {
      const target = pkg.exports[`./${preset}`]
      assert.ok(target, `missing export ./${preset}`)
      assert.doesNotThrow(() => JSON.parse(readFileSync(join(root, target), 'utf8')), preset)
    }
  })

  it('only ships the presets', () => {
    const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    const [{ files }] = JSON.parse(result.stdout)
    const paths = files.map((f) => f.path).sort()
    assert.deepEqual(paths, [
      'LICENSE',
      'README.md',
      'package.json',
      'presets/base.json',
      'presets/lib.json',
      'presets/react.json',
    ])
  })
})

describe('base', () => {
  const clean = "import { b } from './b'\n\nexport const a = b('x')\n"

  it('accepts code in the house style', () => {
    const dir = consumer({ presets: ['base'], files: { 'src/a.ts': clean } })
    const { status, output } = check(dir)
    assert.equal(status, 0, output)
  })

  it('rejects double quotes and semicolons', () => {
    const dir = consumer({
      presets: ['base'],
      files: { 'src/a.ts': 'import { b } from "./b";\n\nexport const a = b("x");\n' },
    })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /format/)
  })

  it('relaxes noExplicitAny in test files only', () => {
    const source = 'export const a = (x: any) => x\n'
    const dir = consumer({
      presets: ['base'],
      files: { 'src/a.ts': source, 'test/a.test.ts': source },
    })
    const { output } = check(dir)
    assert.match(output, /src\/a\.ts/)
    assert.doesNotMatch(output, /test\/a\.test\.ts/)
  })

  it('flags explicit any without the lib preset', () => {
    const dir = consumer({ presets: ['base'], files: { 'src/a.ts': 'export const a: any = 1\n' } })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /noExplicitAny/)
  })

  it('requires the node: protocol without the lib preset', () => {
    const dir = consumer({
      presets: ['base'],
      files: { 'src/a.ts': "import fs from 'fs'\nexport const sep = fs.sep\n" },
    })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /useNodejsImportProtocol/)
  })

  it('flags unused imports and variables without the lib preset', () => {
    const dir = consumer({
      presets: ['base'],
      files: {
        'src/b.ts': 'export const b = 1\n',
        'src/a.ts':
          "import { b } from './b'\nexport function f() {\n  const unusedVar = 1\n  return 2\n}\n",
      },
    })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /noUnusedImports/)
    assert.match(output, /noUnusedVariables/)
  })

  it('requires curly braces (curly: all)', () => {
    const dir = consumer({
      presets: ['base'],
      files: { 'src/a.ts': 'export function f(x: boolean) {\n  if (x) return 1\n  return 2\n}\n' },
    })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /useBlockStatements/)
  })

  it('requires default parameters last', () => {
    const dir = consumer({
      presets: ['base'],
      files: { 'src/a.ts': 'export function f(a = 0, b: number) {\n  return [a, b]\n}\n' },
    })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /useDefaultParameterLast/)
  })

  it('requires the default switch clause last', () => {
    const dir = consumer({
      presets: ['base'],
      files: {
        'src/a.ts':
          'export function f(x: number) {\n  switch (x) {\n    default:\n      break\n    case 0:\n      break\n  }\n}\n',
      },
    })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /useDefaultSwitchClauseLast/)
  })

  it('enforces camelcase naming', () => {
    const dir = consumer({ presets: ['base'], files: { 'src/a.ts': 'export const my_var = 1\n' } })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /useNamingConvention/)
  })

  it('sorts imports (organizeImports)', () => {
    const dir = consumer({
      presets: ['base'],
      files: {
        'src/b.ts': 'export const b = 1\n',
        'src/a.ts': 'export const a = 2\n',
        'src/main.ts': "import { b } from './b'\nimport { a } from './a'\nexport const x = a + b\n",
      },
    })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /organizeImports/)
  })

  it('requires import type for type-only imports', () => {
    const dir = consumer({
      presets: ['base'],
      files: {
        'src/types.ts': 'export type Foo = number\n',
        'src/a.ts': "import { Foo } from './types'\nexport const x: Foo = 1\n",
      },
    })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /useImportType/)
  })
})

describe('lib', () => {
  it('forbids default exports, except in config files', () => {
    const dir = consumer({
      presets: ['base', 'lib'],
      files: {
        'src/a.ts': 'export default 1\n',
        'tsup.config.ts': 'export default {}\n',
      },
    })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /noDefaultExport/)
    assert.match(output, /src\/a\.ts/)
    assert.doesNotMatch(output, /tsup\.config\.ts/)
  })

  it('is not applied by base alone', () => {
    const dir = consumer({ presets: ['base'], files: { 'src/a.ts': 'export default 1\n' } })
    const { status, output } = check(dir)
    assert.equal(status, 0, output)
  })

  it('does not flag console usage', () => {
    const dir = consumer({
      presets: ['base', 'lib'],
      files: { 'src/a.ts': "export const log = () => console.log('x')\n" },
    })
    const { status, output } = check(dir)
    assert.equal(status, 0, output)
  })
})

describe('react', () => {
  const component = [
    "import { useEffect } from 'react'",
    '',
    'export function Comp({ id }: { id: string }) {',
    '  useEffect(() => {',
    '    console.info(id)',
    '  }, [])',
    '  return <div className="x">{id}</div>',
    '}',
    '',
  ].join('\n')

  it('enables the React domain rules', () => {
    const dir = consumer({
      presets: ['base', 'react'],
      files: { 'src/comp.tsx': component },
    })
    const { status, output } = check(dir)
    assert.notEqual(status, 0)
    assert.match(output, /useExhaustiveDependencies/)
  })

  it('is not applied by base alone', () => {
    const dir = consumer({ presets: ['base'], files: { 'src/comp.tsx': component } })
    const { output } = check(dir)
    assert.doesNotMatch(output, /useExhaustiveDependencies/)
  })
})
