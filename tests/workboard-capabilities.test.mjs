#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CORE_CAPABILITIES,
  parseJsonWithoutDuplicateKeys,
  readCapabilityManifest,
  refreshEvidenceDigests,
  validateCapabilityManifest,
} from '../scripts/check-workboard-capabilities.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts/check-workboard-capabilities.mjs');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function current() {
  return readCapabilityManifest({ repo: root }).manifest;
}

function fixture() {
  const target = mkdtempSync(join(tmpdir(), 'workboard-capabilities-'));
  const manifest = current();
  const paths = new Set([
    'workboard-capabilities.json',
    manifest.$schema,
    manifest.starter_sync.adoption_record,
  ]);
  for (const capability of Object.values(manifest.capabilities)) {
    for (const path of [...capability.evidence.files, ...capability.evidence.tests]) paths.add(path);
  }
  for (const path of paths) {
    mkdirSync(dirname(join(target, path)), { recursive: true });
    copyFileSync(join(root, path), join(target, path));
  }
  return { root: target, manifest };
}

test('current manifest validates every merged capability through ST-024', () => {
  const manifest = current();
  const result = validateCapabilityManifest({ repo: root, manifest });
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(CORE_CAPABILITIES.filter((id) => !Object.hasOwn(manifest.capabilities, id)), []);
  assert.equal(manifest.starter_sync.release, 'ST-024');
  assert.equal(manifest.starter_sync.commit, null);
  assert.deepEqual(manifest.capabilities.task_finalization_hygiene, {
    status: 'supported',
    version: '1.0.0',
    summary: 'Conservative Codex task finalization classifies bounded candidates for verified app-native hygiene.',
    evidence: {
      files: [
        'scripts/classify-codex-task-finalizer.mjs',
        'docs/codex-task-finalization.md',
      ],
      tests: [
        'tests/codex-task-finalizer.test.mjs',
        'tests/codex-task-finalization-docs.test.mjs',
      ],
    },
    evidence_sha256: manifest.capabilities.task_finalization_hygiene.evidence_sha256,
  });
  assert.deepEqual(manifest.capabilities.task_packet_schema, {
    status: 'supported',
    version: '2.1.0',
    summary: 'Strict packet schema validation includes explicit Local-versus-Worktree intent and resolution.',
    evidence: {
      files: [
        'scripts/check-task-packet.mjs',
        'docs/task-packet-schema.md',
        'templates/task-packet.md',
      ],
      tests: ['tests/check-task-packet.test.mjs'],
    },
    evidence_sha256: manifest.capabilities.task_packet_schema.evidence_sha256,
  });
  assert.deepEqual(manifest.capabilities.execution_environment_routing, {
    status: 'supported',
    version: '1.0.0',
    summary: 'Packet intent, project defaults, canonical reuse, and app-native proof resolve Local or Worktree execution.',
    evidence: {
      files: [
        'docs/orchestrator-protocol.md',
        'skills/workboard-orchestrator/SKILL.md',
        'templates/task-packet.md',
        'projects.example.yaml',
      ],
      tests: [
        'tests/execution-environment-routing.test.mjs',
        'tests/check-task-packet.test.mjs',
      ],
    },
    evidence_sha256: manifest.capabilities.execution_environment_routing.evidence_sha256,
  });
  assert.deepEqual(manifest.capabilities.upstream_synchronization, {
    status: 'supported',
    version: '1.0.0',
    summary: 'Production-derived upgrades require synchronized portable surfaces, release metadata, and manifest validation.',
    evidence: {
      files: [
        'scripts/check-upstream-sync.mjs',
        'docs/upstream-synchronization.md',
      ],
      tests: ['tests/upstream-sync.test.mjs'],
    },
    evidence_sha256: manifest.capabilities.upstream_synchronization.evidence_sha256,
  });
});

test('rejects duplicate JSON keys at top level and every nested object depth', () => {
  const input = fixture();
  const source = readFileSync(join(input.root, 'workboard-capabilities.json'), 'utf8');
  const duplicateTop = source.replace(
    '  "protocol_version": "1.5.0",',
    '  "protocol_version": "1.5.0",\n  "protocol_version": "9.9.9",',
  );
  writeFileSync(join(input.root, 'workboard-capabilities.json'), duplicateTop);
  assert.throws(
    () => readCapabilityManifest({ repo: input.root }),
    /duplicate JSON key \$\["protocol_version"\]/,
  );

  writeFileSync(
    join(input.root, 'workboard-capabilities.json'),
    source.replace(
      '      "status": "supported",',
      '      "status": "supported",\n      "status": "not_implemented",',
    ),
  );
  assert.throws(
    () => readCapabilityManifest({ repo: input.root }),
    /duplicate JSON key \$\["capabilities"\]\["scheduled_control_cycle"\]\["status"\]/,
  );

  assert.throws(
    () => parseJsonWithoutDuplicateKeys('{"outer":[{"key":1,"\\u006bey":2}]}'),
    /duplicate JSON key \$\["outer"\]\[0\]\["key"\]/,
  );
});

test('rejects stale evidence and refreshes it only through an explicit command', () => {
  const input = fixture();
  const evidence = input.manifest.capabilities.queue_classifier.evidence.files[0];
  writeFileSync(join(input.root, evidence), `${readFileSync(join(input.root, evidence), 'utf8')}\nchanged\n`);
  let result = validateCapabilityManifest({ repo: input.root, manifest: input.manifest });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('; '), /queue_classifier evidence digest is stale/);

  refreshEvidenceDigests({ repo: input.root });
  const refreshed = readCapabilityManifest({ repo: input.root }).manifest;
  result = validateCapabilityManifest({ repo: input.root, manifest: refreshed });
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('supported claims require SemVer, contract files, and focused tests', () => {
  const manifest = current();
  for (const mutation of [
    (entry) => { entry.version = null; },
    (entry) => { entry.evidence.files = []; },
    (entry) => { entry.evidence.tests = []; },
  ]) {
    const candidate = clone(manifest);
    mutation(candidate.capabilities.queue_classifier);
    const result = validateCapabilityManifest({ repo: root, manifest: candidate, checkDigests: false });
    assert.equal(result.valid, false);
    assert.match(result.errors.join('; '), /requires a SemVer version|requires file evidence|requires test evidence/);
  }
});

test('test evidence must use focused top-level tests files', () => {
  const manifest = current();
  const candidate = clone(manifest);
  candidate.capabilities.queue_classifier.evidence.tests = ['docs/capability-manifest.md'];
  const result = validateCapabilityManifest({ repo: root, manifest: candidate, checkDigests: false });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('; '), /top-level tests\/\*\.test\.mjs paths/);
});

test('not-implemented claims require a repository file and cannot claim tests', () => {
  const manifest = current();
  for (const mutation of [
    (entry) => { entry.evidence.files = []; },
    (entry) => { entry.evidence.tests = ['tests/workboard-capabilities.test.mjs']; },
  ]) {
    const candidate = clone(manifest);
    const entry = candidate.capabilities.task_finalization_hygiene;
    entry.status = 'not_implemented';
    entry.version = null;
    entry.evidence = { files: ['docs/pending-improvements.md'], tests: [] };
    mutation(entry);
    const result = validateCapabilityManifest({ repo: root, manifest: candidate, checkDigests: false });
    assert.equal(result.valid, false);
    assert.match(result.errors.join('; '), /requires file evidence|cannot claim test evidence/);
  }
});

test('requires exactly one portable starter release or full commit coordinate', () => {
  const manifest = current();
  for (const sync of [
    { release: null, commit: null },
    { release: 'ST-014', commit: 'a'.repeat(40) },
    { release: null, commit: 'short' },
  ]) {
    const candidate = clone(manifest);
    Object.assign(candidate.starter_sync, sync);
    const result = validateCapabilityManifest({ repo: root, manifest: candidate, checkDigests: false });
    assert.equal(result.valid, false);
    assert.match(result.errors.join('; '), /exactly one valid release or commit/);
  }
});

test('rejects missing core capabilities and unknown fields', () => {
  const manifest = current();
  const missing = clone(manifest);
  delete missing.capabilities.git_preflight;
  missing.extra = true;
  const result = validateCapabilityManifest({ repo: root, manifest: missing, checkDigests: false });
  assert.match(result.errors.join('; '), /unknown field extra/);
  assert.match(result.errors.join('; '), /missing core capability git_preflight/);
});

test('rejects internal symlink directories and final symlink evidence', () => {
  const directoryInput = fixture();
  const scripts = new Set();
  for (const capability of Object.values(directoryInput.manifest.capabilities)) {
    for (const path of capability.evidence.files) {
      if (path.startsWith('scripts/')) scripts.add(path);
    }
  }
  rmSync(join(directoryInput.root, 'scripts'), { recursive: true });
  mkdirSync(join(directoryInput.root, 'actual-scripts'));
  for (const path of scripts) copyFileSync(join(root, path), join(directoryInput.root, 'actual-scripts', path.slice('scripts/'.length)));
  symlinkSync('actual-scripts', join(directoryInput.root, 'scripts'), 'dir');
  let result = validateCapabilityManifest({ repo: directoryInput.root, manifest: directoryInput.manifest });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('; '), /path component must not be a symbolic link: scripts/);

  const finalInput = fixture();
  const path = finalInput.manifest.capabilities.known_issues_recovery.evidence.files[0];
  const backup = join(dirname(join(finalInput.root, path)), 'known-issues-copy.md');
  copyFileSync(join(finalInput.root, path), backup);
  unlinkSync(join(finalInput.root, path));
  symlinkSync('known-issues-copy.md', join(finalInput.root, path));
  result = validateCapabilityManifest({ repo: finalInput.root, manifest: finalInput.manifest });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('; '), /path component must not be a symbolic link: docs\/known-issues-and-recovery\.md/);
});

test('rejects aliased and non-directory evidence path components', () => {
  const manifest = current();
  const aliased = clone(manifest);
  aliased.capabilities.queue_classifier.evidence.files = ['docs/../docs/orchestrator-protocol.md'];
  let result = validateCapabilityManifest({ repo: root, manifest: aliased, checkDigests: false });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('; '), /must not contain empty, dot, or dot-dot path components/);

  const nonDirectory = clone(manifest);
  nonDirectory.capabilities.queue_classifier.evidence.files = ['README.md/child'];
  result = validateCapabilityManifest({ repo: root, manifest: nonDirectory, checkDigests: false });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('; '), /path component must be a directory: README\.md/);
});

test('CLI emits one machine-readable status and rejects unsupported options', () => {
  const valid = spawnSync(process.execPath, [script, '--repo', root], { encoding: 'utf8' });
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /^CAPABILITY_MANIFEST_STATUS=VALID SCHEMA_VERSION=1 PROTOCOL_VERSION=1\.5\.0 /);

  const rejected = spawnSync(process.execPath, [script, '--repo', root, '--unknown', 'value'], { encoding: 'utf8' });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /^CAPABILITY_MANIFEST_STATUS=CHECK_FAILED /);
});
