import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const biomeBin = join(root, 'node_modules', '.bin', 'biome');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const PRESETS = ['base', 'lib', 'react'];

const tmpDirs = [];
after(() => {
  for (const dir of tmpDirs) rmSync(dir, { force: true, recursive: true });
});

// Builds a throwaway project that consumes this package from node_modules, like a real consumer.
function consumer({ presets, files }) {
  const dir = mkdtempSync(join(tmpdir(), 'biome-config-'));
  tmpDirs.push(dir);
  mkdirSync(join(dir, 'node_modules', '@favasconcelos'), { recursive: true });
  symlinkSync(root, join(dir, 'node_modules', '@favasconcelos', 'biome-config'), 'dir');
  writeFileSync(join(dir, 'biome.json'), `${JSON.stringify({ extends: presets.map((p) => `@favasconcelos/biome-config/${p}`) }, null, 2)}\n`);
  writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  return { files, path: dir };
}

function check(dir) {
  const targets = Object.keys(dir.files);
  const result = spawnSync(biomeBin, ['check', '--colors=off', ...targets], {
    cwd: dir.path,
    encoding: 'utf8',
  });
  return { output: `${result.stdout}\n${result.stderr}`, status: result.status };
}

describe('package', () => {
  it('exports one parseable JSON file per preset', () => {
    for (const preset of PRESETS) {
      const target = pkg.exports[`./${preset}`];
      assert.ok(target, `missing export ./${preset}`);
      assert.doesNotThrow(() => JSON.parse(readFileSync(join(root, target), 'utf8')), preset);
    }
  });

  it('only ships the presets', () => {
    const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const [{ files }] = JSON.parse(result.stdout);
    const paths = files.map((f) => f.path).sort();
    assert.deepEqual(paths, ['LICENSE', 'README.md', 'package.json', 'presets/base.json', 'presets/lib.json', 'presets/react.json']);
  });
});

describe('base', () => {
  const clean = "import { b } from './b';\n\nexport const a = b('x');\n";

  it('accepts code in the house style', () => {
    const dir = consumer({ files: { 'src/a.ts': clean }, presets: ['base'] });
    const { status, output } = check(dir);
    assert.equal(status, 0, output);
  });

  it('rejects double quotes and missing semicolons', () => {
    const dir = consumer({
      files: { 'src/a.ts': 'import { b } from "./b"\n\nexport const a = b("x")\n' },
      presets: ['base'],
    });
    const { status, output } = check(dir);
    assert.notEqual(status, 0);
    assert.match(output, /format/);
  });

  it('relaxes noExplicitAny in test files only', () => {
    const source = 'export const a = (x: any) => x;\n';
    const dir = consumer({
      files: { 'src/a.ts': source, 'test/a.test.ts': source },
      presets: ['base'],
    });
    const { output } = check(dir);
    assert.match(output, /src\/a\.ts/);
    assert.doesNotMatch(output, /test\/a\.test\.ts/);
  });

  it('sorts keys everywhere except package manifests', () => {
    const unsorted = '{\n  "name": "a",\n  "version": "1.0.0",\n  "author": "b"\n}\n';
    const dir = consumer({
      files: { 'config.json': unsorted, 'package-lock.json': unsorted, 'package.json': unsorted },
      presets: ['base'],
    });
    const { output } = check(dir);
    assert.match(output, /config\.json/);
    assert.doesNotMatch(output, /package(-lock)?\.json/);
  });
});

describe('lib', () => {
  it('forbids default exports, except in config files', () => {
    const dir = consumer({
      files: {
        'src/a.ts': 'export default 1;\n',
        'tsup.config.ts': 'export default {};\n',
      },
      presets: ['base', 'lib'],
    });
    const { status, output } = check(dir);
    assert.notEqual(status, 0);
    assert.match(output, /noDefaultExport/);
    assert.match(output, /src\/a\.ts/);
    assert.doesNotMatch(output, /tsup\.config\.ts/);
  });

  it('is not applied by base alone', () => {
    const dir = consumer({ files: { 'src/a.ts': 'export default 1;\n' }, presets: ['base'] });
    const { status, output } = check(dir);
    assert.equal(status, 0, output);
  });

  it('does not flag console usage', () => {
    const dir = consumer({
      files: { 'src/a.ts': "export const log = () => console.log('x');\n" },
      presets: ['base', 'lib'],
    });
    const { status, output } = check(dir);
    assert.equal(status, 0, output);
  });
});

describe('react', () => {
  const component = [
    "import { useEffect } from 'react';",
    '',
    'export function Comp({ id }: { id: string }) {',
    '  useEffect(() => {',
    '    console.info(id);',
    '  }, []);',
    '  return <div className="x">{id}</div>;',
    '}',
    '',
  ].join('\n');

  it('enables the React domain rules', () => {
    const dir = consumer({
      files: { 'src/comp.tsx': component },
      presets: ['base', 'react'],
    });
    const { status, output } = check(dir);
    assert.notEqual(status, 0);
    assert.match(output, /useExhaustiveDependencies/);
  });

  it('is not applied by base alone', () => {
    const dir = consumer({ files: { 'src/comp.tsx': component }, presets: ['base'] });
    const { output } = check(dir);
    assert.doesNotMatch(output, /useExhaustiveDependencies/);
  });
});
