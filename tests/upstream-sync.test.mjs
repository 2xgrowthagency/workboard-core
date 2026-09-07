#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  chmodSync,
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validateUpstreamSync } from '../scripts/check-upstream-sync.mjs';
import {
  CORE_CAPABILITIES,
  computeEvidenceDigest,
} from '../scripts/check-workboard-capabilities.mjs';

const REQUIRED = [
  'docs/orchestrator-protocol.md',
  'skills/workboard-orchestrator/SKILL.md',
  'templates/task-packet.md',
  'docs/automation-examples.md',
  'tests/example.test.mjs',
];

function capabilityManifest(root) {
  const capabilities = {};
  for (const id of CORE_CAPABILITIES) {
    const pending = id === 'task_finalization_hygiene';
    const evidence = {
      files: ['docs/orchestrator-protocol.md'],
      tests: pending ? [] : ['tests/example.test.mjs'],
    };
    capabilities[id] = {
      status: pending ? 'not_implemented' : 'supported',
      version: pending ? null : '1.0.0',
      summary: pending ? 'This fixture capability remains intentionally unavailable.' : 'This fixture capability is supported by portable evidence.',
      evidence,
      evidence_sha256: computeEvidenceDigest(root, evidence),
    };
  }
  return `${JSON.stringify({
    $schema: 'schemas/workboard-capabilities.schema.json',
    manifest_schema_version: 1,
    protocol_version: '1.0.0',
    compatibility: {
      classification: 'backward-compatible',
      minimum_reader_schema_version: 1,
      unknown_capability_policy: 'ignore',
    },
    starter_sync: {
      release: 'ST-TEST',
      commit: null,
      source_reference: 'https://github.com/example/workboard-starter/issues/42',
      adoption_record: 'docs/releases/st-test.md',
    },
    capabilities,
  }, null, 2)}\n`;
}

function run(command, args, cwd, expected = 0) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, expected, result.stderr || result.stdout);
  return result.stdout.trim();
}

function write(root, path, contents) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), contents);
}

function record(overrides = {}) {
  const values = {
    schema_version: '1',
    upgrade_id: 'ST-TEST',
    source_reference: 'https://github.com/example/workboard-starter/issues/42',
    compatibility: 'backward-compatible',
    migration_impact: 'none',
    downstream_adoption_reference: 'https://github.com/example/workboard-starter/issues/42',
    ...overrides,
  };
  return `---\n${Object.entries(values).map(([key, value]) => `${key}: ${value}`).join('\n')}\n---\n\n# Test release\n`;
}

function fixture({ recordInBase = false, parent = tmpdir() } = {}) {
  const root = mkdtempSync(join(parent, 'workboard upstream sync-'));
  run('git', ['init', '-q'], root);
  run('git', ['config', 'user.email', 'test@example.com'], root);
  run('git', ['config', 'user.name', 'Test User'], root);
  for (const path of REQUIRED) write(root, path, 'baseline\n');
  write(root, 'schemas/workboard-capabilities.schema.json', '{}\n');
  write(root, 'workboard-capabilities.json', '{}\n');
  write(root, 'README.md', 'baseline\n');
  if (recordInBase) write(root, 'docs/releases/st-test.md', record());
  run('git', ['add', '.'], root);
  run('git', ['commit', '-qm', 'baseline'], root);
  const base = run('git', ['rev-parse', 'HEAD'], root);
  for (const path of REQUIRED) write(root, path, `${readFileSync(join(root, path), 'utf8')}portable update\n`);
  if (!recordInBase) write(root, 'docs/releases/st-test.md', record());
  write(root, 'workboard-capabilities.json', capabilityManifest(root));
  return { root, base, recordPath: 'docs/releases/st-test.md' };
}

function statusLines(result) {
  return `${result.stdout}\n${result.stderr}`
    .split(/\r?\n/)
    .filter((line) => line.startsWith('UPSTREAM_SYNC_STATUS='));
}

function assertSingleStatus(result, expected) {
  const lines = statusLines(result);
  assert.equal(lines.length, 1, `expected exactly one status line:\n${result.stdout}\n${result.stderr}`);
  assert.match(lines[0], new RegExp(`^UPSTREAM_SYNC_STATUS=${expected}\\b`));
}

function cli(script, input, cwd = input.root, extra = []) {
  return spawnSync(process.execPath, [
    script,
    '--repo', input.root,
    '--base', input.base,
    '--record', input.recordPath,
    ...extra,
  ], { cwd, encoding: 'utf8' });
}

test('accepts a complete customized clone change without a remote or fork', () => {
  const input = fixture();
  const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.record.compatibility, 'backward-compatible');
  assert.equal(result.record.downstream_adoption_reference, result.record.source_reference);
});

test('ignores clone-specific external diff drivers', () => {
  const input = fixture();
  run('git', ['config', 'diff.external', 'command-that-must-not-run'], input.root);
  const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('accepts a fully staged change set', () => {
  const input = fixture();
  run('git', ['add', '.'], input.root);
  const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('rejects a prohibited staged snapshot hidden by an unstaged worktree edit', () => {
  const input = fixture();
  write(input.root, 'README.md', 'baseline\n/Users/' + 'alice/workboard\n');
  run('git', ['add', '.'], input.root);
  write(input.root, 'README.md', 'baseline\nportable update\n');
  const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('; '), /cannot be mixed|user-specific absolute path/);
});

test('requires every synchronized surface and focused tests', () => {
  const input = fixture();
  write(input.root, 'skills/workboard-orchestrator/SKILL.md', 'baseline\n');
  write(input.root, 'tests/example.test.mjs', 'baseline\n');
  const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('required synchronized surface is unchanged: skills/workboard-orchestrator/SKILL.md'));
  assert.ok(result.errors.includes('at least one focused tests/*.test.mjs file must change'));
});

test('rejects a mode-only change to a pre-existing release record', () => {
  const input = fixture({ recordInBase: true });
  chmodSync(join(input.root, input.recordPath), 0o755);
  const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes(`release record has no added content: ${input.recordPath}`));
});

test('rejects internal and escaped release-record symlinks', () => {
  for (const escaped of [false, true]) {
    const input = fixture();
    const recordPath = join(input.root, input.recordPath);
    rmSync(recordPath);
    if (escaped) {
      const outside = join(dirname(input.root), `outside-record-${Date.now()}.md`);
      writeFileSync(outside, record());
      symlinkSync(outside, recordPath);
    } else {
      write(input.root, 'docs/releases/actual.md', record());
      symlinkSync('actual.md', recordPath);
    }
    const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
    assert.equal(result.valid, false);
    assert.match(result.errors.join('; '), escaped ? /outside the canonical repository root/ : /must not be a symbolic link/);
  }
});

test('rejects internal and escaped synchronized-surface symlinks', () => {
  for (const escaped of [false, true]) {
    const input = fixture();
    const surface = join(input.root, 'docs/orchestrator-protocol.md');
    rmSync(surface);
    if (escaped) {
      const outside = join(dirname(input.root), `outside-protocol-${Date.now()}.md`);
      writeFileSync(outside, 'portable update\n');
      symlinkSync(outside, surface);
    } else {
      write(input.root, 'docs/actual-protocol.md', 'portable update\n');
      symlinkSync('actual-protocol.md', surface);
    }
    const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
    assert.equal(result.valid, false);
    assert.match(result.errors.join('; '), escaped ? /outside the canonical repository root/ : /must not be a symbolic link/);
  }
});

test('rejects directories and FIFOs before reading release content', { skip: process.platform === 'win32' }, () => {
  const directoryInput = fixture();
  const directoryRecord = join(directoryInput.root, directoryInput.recordPath);
  rmSync(directoryRecord);
  mkdirSync(directoryRecord);
  const directoryResult = validateUpstreamSync({
    repo: directoryInput.root,
    base: directoryInput.base,
    recordPath: directoryInput.recordPath,
  });
  assert.equal(directoryResult.valid, false);
  assert.match(directoryResult.errors.join('; '), /release\/adoption record must be a regular file/);

  const fifoInput = fixture();
  const fifoRecord = join(fifoInput.root, fifoInput.recordPath);
  rmSync(fifoRecord);
  const made = spawnSync('mkfifo', [fifoRecord], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr);
  const fifoResult = validateUpstreamSync({ repo: fifoInput.root, base: fifoInput.base, recordPath: fifoInput.recordPath });
  assert.equal(fifoResult.valid, false);
  assert.match(fifoResult.errors.join('; '), /release\/adoption record must be a regular file/);
});

test('requires explicit compatibility, migration impact, and matching adoption backlink', () => {
  const input = fixture();
  write(input.root, input.recordPath, record({
    compatibility: 'maybe',
    migration_impact: '<TODO>',
    downstream_adoption_reference: 'https://github.com/example/workboard-starter/releases/tag/v2',
  }));
  const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('; '), /migration_impact is missing or placeholder|compatibility value is invalid/);
});

test('accepts public starter release URLs as adoption references', () => {
  const input = fixture();
  const release = 'https://github.com/example/workboard-starter/releases/tag/v2.1.0';
  write(input.root, input.recordPath, record({
    source_reference: release,
    compatibility: 'behavior-change',
    migration_impact: 'rerun the queue classifier after updating',
    downstream_adoption_reference: release,
  }));
  const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('rejects newly added non-portable operational details', () => {
  const cases = [
    ['/Users/' + 'alice/workboard', 'user-specific absolute path'],
    ['$' + 'HOME/private-state', 'home-directory expansion'],
    ['automation_' + 'id: 12345678', 'saved automation identifier'],
    ['019f40c4-' + '2ad7-40f2-a6ba-a66bbce6e705', 'host-local UUID identifier'],
    ['customer_' + 'name: Example Customer', 'private identity value'],
    ['owner: ali' + 'ce@private-company.test', 'private email identity'],
    ['access_' + 'token=example-secret-value', 'credential or token value'],
    ['state_' + '5.sqlite', 'local database or session assumption'],
    ['CODEX_' + 'THREAD_ID', 'local database or session assumption'],
  ];
  for (const [value, expected] of cases) {
    const input = fixture();
    write(input.root, 'README.md', `baseline\n${value}\n`);
    const result = validateUpstreamSync({ repo: input.root, base: input.base, recordPath: input.recordPath });
    assert.equal(result.valid, false, value);
    assert.match(result.errors.join('; '), new RegExp(expected), value);
  }
});

test('CLI emits exactly one status for absolute and relative invocation from paths with spaces', () => {
  const input = fixture();
  const script = fileURLToPath(new URL('../scripts/check-upstream-sync.mjs', import.meta.url));
  const absolute = cli(script, input);
  assert.equal(absolute.status, 0, absolute.stderr);
  assertSingleStatus(absolute, 'VALID');

  const relativeScript = relative(realpathSync(input.root), realpathSync(script));
  const relativeRun = cli(relativeScript, input);
  assert.equal(relativeRun.status, 0, relativeRun.stderr);
  assertSingleStatus(relativeRun, 'VALID');

  const invalid = spawnSync(process.execPath, [script, '--repo', input.root], {
    cwd: input.root,
    encoding: 'utf8',
  });
  assert.equal(invalid.status, 1);
  assertSingleStatus(invalid, 'CHECK_FAILED');
});

test('CLI main detection survives the macOS /tmp canonical path alias', {
  skip: process.platform !== 'darwin' || realpathSync('/tmp') === '/tmp',
}, (t) => {
  const input = fixture({ parent: '/tmp' });
  const runner = mkdtempSync('/tmp/workboard-validator-');
  t.after(() => rmSync(runner, { recursive: true, force: true }));
  for (const name of ['check-upstream-sync.mjs', 'check-workboard-capabilities.mjs']) {
    copyFileSync(fileURLToPath(new URL(`../scripts/${name}`, import.meta.url)), join(runner, name));
  }
  const alias = join(runner, 'check-upstream-sync.mjs');
  assert.notEqual(alias, realpathSync(alias));
  const result = cli(alias, input);
  assert.equal(result.status, 0, result.stderr);
  assertSingleStatus(result, 'VALID');
});

test('CLI main detection survives a symlinked script alias', () => {
  const input = fixture();
  const script = realpathSync(fileURLToPath(new URL('../scripts/check-upstream-sync.mjs', import.meta.url)));
  const alias = join(dirname(input.root), `validator alias ${Date.now()}.mjs`);
  symlinkSync(script, alias);
  const result = cli(alias, input);
  assert.equal(result.status, 0, result.stderr);
  assertSingleStatus(result, 'VALID');
});

test('importing the validator has no CLI side effects', () => {
  const script = fileURLToPath(new URL('../scripts/check-upstream-sync.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [
    '--input-type=module',
    '--eval',
    `await import(${JSON.stringify(pathToFileURL(script).href)})`,
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
  assert.equal(statusLines(result).length, 0);
});

test('portable entry points describe the same synchronized release contract', () => {
  const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');
  for (const path of [
    'README.md',
    'CONTRIBUTING.md',
    'RELEASE.md',
    'docs/orchestrator-protocol.md',
    'skills/workboard-orchestrator/SKILL.md',
    'templates/task-packet.md',
    'docs/automation-examples.md',
  ]) {
    const source = read(path);
    assert.match(source, /production-derived/i, `${path} must identify the trigger`);
    assert.match(source, /check-upstream-sync\.mjs/, `${path} must name the validator`);
  }
});
