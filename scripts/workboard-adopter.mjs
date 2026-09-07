#!/usr/bin/env node
// Read-only release inspection and upgrade proposals. Never applies, pushes, or activates.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseJsonWithoutDuplicateKeys as parseJSON } from './check-workboard-capabilities.mjs';

export const MANIFEST = 'workboard-adopter-release.json';
export const OWNED = ['projects.yaml', 'AGENTS.md', '.env*', '.local/', 'tasks/', 'adopter/', 'scheduler state', 'credentials', 'identity', 'worker history'];
export const PREREQUISITES = ['accountable_operator', 'repository_ownership', 'github_auth', 'linear_membership', 'operator_executor_labels', 'project_host_binding', 'private_adapter', 'adapter_certification', 'manual_claim_canary', 'manual_callback_canary', 'independent_qa', 'rollback_plan'];
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
function requireThat(ok, message) { if (!ok) throw new Error(message); }
function keys(value, expected, label) {
  requireThat(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  requireThat(Object.keys(value).sort().join('|') === [...expected].sort().join('|'), `${label}: missing or unknown fields`);
}
function managedPath(path) {
  return ['README.md', 'CONTRIBUTING.md', 'RELEASE.md', 'workboard-capabilities.json', 'ORCHESTRATOR.md', 'projects.example.yaml'].includes(path) || (typeof path === 'string'
    && /^(scripts|schemas|docs|templates|tests|skills)\/[a-zA-Z0-9_./-]+$/.test(path)
    && path.split('/').every(part => part && part !== '.' && part !== '..')
    && /\.(mjs|json|md|yaml)$/.test(path));
}
function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' } });
  requireThat(result.status === 0, 'git input could not be verified');
  return result.stdout;
}
function root(repo) {
  const value = realpathSync(repo);
  requireThat(realpathSync(git(value, ['rev-parse', '--show-toplevel']).trim()) === value, 'expected exact repository root');
  return value;
}
// Checks every component before reading; private or unlisted paths are never traversed.
function bytesAt(repo, path) {
  let current = repo;
  const parts = path.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    let stat;
    try { stat = lstatSync(current); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    requireThat(!stat.isSymbolicLink(), `unsafe path: ${path}`);
    requireThat(i === parts.length - 1 ? stat.isFile() : stat.isDirectory(), `nonregular path: ${path}`);
  }
  return readFileSync(current);
}
function modeAt(repo, path) {
  return lstatSync(join(repo, path)).mode & 0o111 ? '100755' : '100644';
}
export function validateManifest(m) {
  keys(m, ['schema_version', 'release', 'protocol_version', 'source_reference', 'compatibility', 'migrations', 'adopter_owned', 'files'], 'manifest');
  requireThat(m.schema_version === 1, 'unsupported manifest schema');
  requireThat(/^ST-\d{3}$/.test(m.release) && SEMVER.test(m.protocol_version), 'invalid release or protocol');
  requireThat(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(issues\/\d+|releases\/tag\/[\w.-]+)$/.test(m.source_reference), 'invalid public source reference');
  requireThat(m.compatibility === 'backward-compatible', 'unsupported compatibility; explicit migration required');
  requireThat(JSON.stringify(m.adopter_owned) === JSON.stringify(OWNED), 'adopter ownership boundary mismatch');
  requireThat(Array.isArray(m.migrations) && m.migrations.length > 0 && m.migrations.every(p => /^docs\/releases\/[a-z0-9-]+\.md$/.test(p)), 'invalid migration records');
  requireThat(Array.isArray(m.files) && m.files.length > 0, 'missing file inventory');
  let previous = '';
  for (const file of m.files) {
    keys(file, ['path', 'sha256', 'mode', 'delivery'], 'file');
    requireThat(managedPath(file.path) && file.path > previous, 'unsafe, duplicate, or unordered managed path');
    requireThat(HASH.test(file.sha256), 'invalid compatibility hash');
    requireThat(['100644', '100755'].includes(file.mode), 'invalid file mode');
    requireThat(file.delivery === (file.path.startsWith('skills/') ? 'workshop' : 'patch'), 'invalid delivery boundary');
    previous = file.path;
  }
  for (const p of [...m.migrations, 'ORCHESTRATOR.md', 'projects.example.yaml', 'scripts/workboard-adopter.mjs', 'scripts/check-workboard-thread-title.mjs', 'scripts/linear-single-writer.mjs', 'workboard-capabilities.json']) {
    requireThat(m.files.some(f => f.path === p), `missing required surface: ${p}`);
  }
  return m;
}
export function generateManifest(repo) {
  repo = root(repo);
  const capability = parseJSON(bytesAt(repo, 'workboard-capabilities.json').toString());
  const paths = git(repo, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(managedPath);
  const files = [...new Set(paths)].sort().map(path => {
    const bytes = bytesAt(repo, path);
    requireThat(bytes !== null, `missing release file: ${path}`);
    return { path, sha256: sha(bytes), mode: modeAt(repo, path), delivery: path.startsWith('skills/') ? 'workshop' : 'patch' };
  });
  return validateManifest({ schema_version: 1, release: capability.starter_sync.release,
    protocol_version: capability.protocol_version, source_reference: capability.starter_sync.source_reference,
    compatibility: capability.compatibility.classification, migrations: [capability.starter_sync.adoption_record], adopter_owned: OWNED, files });
}
export function loadRelease(core, ref, { baseline = false } = {}) {
  core = root(core);
  requireThat(SHA.test(ref), 'core-ref must be an immutable lowercase 40-character commit');
  requireThat(git(core, ['rev-parse', '--verify', `${ref}^{commit}`]).trim() === ref, 'unresolved core commit');
  const entries = new Map(git(core, ['ls-tree', '-r', ref]).trim().split('\n').map(line => {
    const [meta, path] = line.split('\t');
    return [path, meta.split(' ')];
  }));
  function blob(path) {
    const meta = entries.get(path);
    requireThat(meta && ['100644', '100755'].includes(meta[0]) && meta[1] === 'blob', `missing or unsafe release surface: ${path}`);
    return Buffer.from(git(core, ['show', `${ref}:${path}`]));
  }
  const modes = new Map([...entries].map(([path, meta]) => [path, meta[0]]));
  // Historical pinned Core commits establish first-adoption ancestry only.
  if (baseline && !entries.has(MANIFEST)) {
    return { files: new Map([...entries.keys()].filter(managedPath).map(path => [path, blob(path)])), modes, commit: ref };
  }
  const manifestBytes = blob(MANIFEST);
  const manifest = validateManifest(parseJSON(manifestBytes.toString()));
  const files = new Map(manifest.files.map(file => {
    const bytes = blob(file.path);
    requireThat(modes.get(file.path) === file.mode, `release mode mismatch: ${file.path}`);
    requireThat(sha(bytes) === file.sha256, `release hash mismatch: ${file.path}`);
    return [file.path, bytes];
  }));
  for (const path of entries.keys()) if (managedPath(path)) requireThat(files.has(path), `unlisted release surface: ${path}`);
  const capability = parseJSON(files.get('workboard-capabilities.json').toString());
  requireThat(capability.protocol_version === manifest.protocol_version && capability.starter_sync.release === manifest.release
    && capability.starter_sync.source_reference === manifest.source_reference
    && capability.compatibility.classification === manifest.compatibility
    && manifest.migrations.includes(capability.starter_sync.adoption_record), 'capability and adoption release coordinates disagree');
  files.set(MANIFEST, manifestBytes);
  return { manifest, files, modes, commit: ref, digest: sha(manifestBytes) };
}
function readiness(input, release) {
  if (input === undefined) return { missing: [...PREREQUISITES, 'identity_readback', 'single_writer_readback', 'scheduler_readback'], blockers: [] };
  keys(input, ['schema_version', 'core_commit', 'identity', 'authority', 'scheduler', 'checks'], 'readiness');
  requireThat(input.schema_version === 1 && input.core_commit === release.commit, 'readiness must bind this exact core commit');
  requireThat(['consistent', 'conflicting', 'unknown'].includes(input.identity), 'invalid identity readiness');
  requireThat(['single_writer', 'conflicting', 'unknown'].includes(input.authority), 'invalid authority readiness');
  requireThat(['disabled', 'enabled', 'unknown'].includes(input.scheduler), 'invalid scheduler readiness');
  keys(input.checks, PREREQUISITES, 'readiness checks');
  requireThat(Object.values(input.checks).every(v => ['verified', 'missing'].includes(v)), 'invalid prerequisite state');
  const missing = PREREQUISITES.filter(p => input.checks[p] !== 'verified');
  const blockers = [];
  if (input.identity === 'conflicting') blockers.push('conflicting_identity');
  if (input.authority === 'conflicting') blockers.push('conflicting_state_authority');
  if (input.identity === 'unknown') missing.push('identity_readback');
  if (input.authority === 'unknown') missing.push('single_writer_readback');
  if (input.scheduler === 'unknown') missing.push('scheduler_readback');
  if (input.scheduler === 'enabled' && (missing.length || blockers.length)) blockers.push('unsafe_scheduler_requires_operator_stop');
  return { missing, blockers };
}
export function inspectAdopter({ repo, release, attestation }) {
  repo = root(repo);
  const runtime = readiness(attestation, release);
  const differences = [];
  for (const [path, desired] of release.files) {
    const actual = bytesAt(repo, path);
    const actualMode = actual === null ? null : modeAt(repo, path);
    const expectedMode = release.modes.get(path);
    if (actual === null || sha(actual) !== sha(desired) || actualMode !== expectedMode) differences.push({ path, reason: actual === null ? 'missing' : 'mismatched', actual_sha256: actual === null ? null : sha(actual), expected_sha256: sha(desired), actual_mode: actualMode, expected_mode: expectedMode });
  }
  const blockers = [...runtime.blockers];
  const adopterManifest = bytesAt(repo, MANIFEST);
  if (!adopterManifest) blockers.push('missing_adopter_manifest');
  else {
    try { validateManifest(parseJSON(adopterManifest.toString())); } catch { blockers.push('invalid_adopter_manifest'); }
  }
  const status = blockers.length ? 'BLOCKED' : differences.length ? 'UPGRADE_REQUIRED' : runtime.missing.length ? 'PARTIAL_NOT_ACTIVE' : 'CURRENT';
  return { schema_version: 1, status, core_commit: release.commit, release: release.manifest.release, manifest_sha256: release.digest, differences, operator_prerequisites: runtime.missing, blockers, activation_authorized: false };
}
function patchFile(path, before, after, oldMode, newMode) {
  const header = `diff --git a/${path} b/${path}\n${before === null ? `new file mode ${newMode}\n` : oldMode !== newMode ? `old mode ${oldMode}\nnew mode ${newMode}\n` : ''}`;
  if (before !== null && before.equals(after)) return header;
  const oldLines = before === null ? [] : before.toString().split('\n');
  const newLines = after.toString().split('\n');
  requireThat((before === null || oldLines.at(-1) === '') && newLines.at(-1) === '', `patch requires newline-terminated text: ${path}`);
  if (before !== null) oldLines.pop();
  newLines.pop();
  return `${header}--- ${before === null ? '/dev/null' : `a/${path}`}\n+++ b/${path}\n@@ -${oldLines.length ? '1' : '0'},${oldLines.length} +1,${newLines.length} @@\n${oldLines.map(l => `-${l}\n`).join('')}${newLines.map(l => `+${l}\n`).join('')}`;
}
export function planUpgrade({ repo, release, previous, attestation }) {
  repo = root(repo);
  const report = inspectAdopter({ repo, release, attestation });
  const blockers = report.blockers.filter(b => b !== 'missing_adopter_manifest');
  const adopterManifest = bytesAt(repo, MANIFEST);
  const adoptedPaths = adopterManifest && !blockers.includes('invalid_adopter_manifest')
    ? new Set(parseJSON(adopterManifest.toString()).files.map(file => file.path)) : new Set();
  const workshop = [];
  const patches = [];
  if (previous) for (const path of previous.files.keys()) if (!release.files.has(path)) blockers.push(`removed_surface_requires_migration:${path}`);
  for (const difference of report.differences) {
    const path = difference.path;
    const before = bytesAt(repo, path);
    const after = release.files.get(path);
    const baseline = previous?.files.get(path);
    const oldMode = before === null ? null : modeAt(repo, path);
    const newMode = release.modes.get(path);
    if (before === null && (baseline || adoptedPaths.has(path))) { blockers.push(`unrecognized_local_removal:${path}`); continue; }
    const recognized = before === null
      || (before.equals(after) && oldMode === newMode)
      || (baseline && before.equals(baseline) && oldMode === previous.modes.get(path));
    if (!recognized) { blockers.push(`unrecognized_local_content:${path}`); continue; }
    if (path.startsWith('skills/')) { workshop.push({ path, expected_sha256: sha(after), expected_mode: newMode, reason: 'Workshop proposal/apply receipt required' }); continue; }
    patches.push(patchFile(path, before, after, oldMode, newMode));
  }
  return { ...report, status: blockers.length ? 'BLOCKED' : report.differences.length ? 'UPGRADE_REQUIRED' : report.status, blockers, workshop, previous_core_commit: previous?.commit ?? null, changes: report.differences.map(d => d.path), patch: blockers.length ? '' : patches.join(''), activation_authorized: false };
}
function args(argv) {
  const [command, ...rest] = argv;
  requireThat(['manifest', 'check', 'plan'].includes(command), 'expected manifest, check, or plan');
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) {
    const name = rest[i]; const value = rest[i + 1];
    requireThat(['--repo', '--core', '--core-ref', '--previous-core-ref', '--readiness', '--format'].includes(name) && value && !value.startsWith('--') && !Object.hasOwn(opts, name), 'unknown, duplicate, or missing option');
    opts[name] = value;
  }
  requireThat(opts['--repo'], 'missing --repo');
  if (command === 'manifest') requireThat(Object.keys(opts).length === 1, 'manifest only accepts --repo');
  else requireThat(opts['--core'] && opts['--core-ref'], 'missing pinned core input');
  if (command !== 'plan') requireThat(!opts['--previous-core-ref'] && !opts['--format'], 'plan-only option');
  if (opts['--format']) requireThat(['json', 'patch'].includes(opts['--format']), 'unknown format');
  return { command, opts };
}
export function main(argv) {
  try {
    const { command, opts } = args(argv);
    if (command === 'manifest') { process.stdout.write(json(generateManifest(opts['--repo']))); return 0; }
    const release = loadRelease(opts['--core'], opts['--core-ref']);
    const previous = opts['--previous-core-ref'] ? loadRelease(opts['--core'], opts['--previous-core-ref'], { baseline: true }) : undefined;
    let attestation;
    if (opts['--readiness']) {
      requireThat(lstatSync(opts['--readiness']).isFile() && !lstatSync(opts['--readiness']).isSymbolicLink(), 'readiness must be a regular file');
      attestation = parseJSON(readFileSync(opts['--readiness'], 'utf8'));
    }
    const result = (command === 'plan' ? planUpgrade : inspectAdopter)({ repo: opts['--repo'], release, previous, attestation });
    if (opts['--format'] === 'patch') {
      requireThat(result.status !== 'BLOCKED', 'blocked proposal; inspect JSON output');
      process.stdout.write(result.patch);
    } else process.stdout.write(json(result));
    return result.status === 'BLOCKED' ? 2 : command === 'check' && result.status !== 'CURRENT' ? 1 : 0;
  } catch (error) {
    process.stderr.write(json({ schema_version: 1, status: 'BLOCKED', error: error.message, activation_authorized: false }));
    return 2;
  }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
