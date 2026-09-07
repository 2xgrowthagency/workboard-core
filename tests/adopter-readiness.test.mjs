import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, unlinkSync, chmodSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { MANIFEST, PREREQUISITES, generateManifest, loadRelease } from '../scripts/workboard-adopter.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts/workboard-adopter.mjs');
function git(repo, ...args) {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
}
function put(repo, path, text) { mkdirSync(dirname(join(repo, path)), { recursive: true }); writeFileSync(join(repo, path), text); }
function commit(repo) { git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'fixture'); return git(repo, 'rev-parse', 'HEAD'); }
function init(repo) { mkdirSync(repo); git(repo, 'init', '-q', '-b', 'main'); git(repo, 'config', 'user.email', 'fixture@example.com'); git(repo, 'config', 'user.name', 'Fixture'); }
function setup(t) {
  const home = mkdtempSync(join(tmpdir(), 'adopter-test-')); t.after(() => rmSync(home, { recursive: true, force: true }));
  const core = join(home, 'core'); const adopter = join(home, 'adopter'); init(core); init(adopter);
  for (const path of ['README.md', 'CONTRIBUTING.md', 'RELEASE.md', 'ORCHESTRATOR.md', 'projects.example.yaml', 'scripts/workboard-adopter.mjs', 'scripts/check-workboard-thread-title.mjs', 'scripts/linear-single-writer.mjs', 'workboard-capabilities.json', 'docs/releases/st-024-adopter-fleet-readiness.md', 'skills/workboard-orchestrator/SKILL.md']) put(core, path, `portable fixture ${path}\n`);
  put(core, 'workboard-capabilities.json', JSON.stringify({ protocol_version: '1.5.0',
    compatibility: { classification: 'backward-compatible' }, starter_sync: { release: 'ST-024',
      source_reference: 'https://github.com/2xgrowthagency/workboard-core/issues/61',
      adoption_record: 'docs/releases/st-024-adopter-fleet-readiness.md' } }) + '\n');
  chmodSync(join(core, 'scripts/check-workboard-thread-title.mjs'), 0o755);
  put(core, MANIFEST, JSON.stringify(generateManifest(core), null, 2) + '\n');
  const ref = commit(core);
  return { home, core, adopter, ref };
}
function run(f, command, extra = []) {
  const r = spawnSync(process.execPath, [script, command, '--repo', f.adopter, '--core', f.core, '--core-ref', f.ref, ...extra], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return { ...r, value: JSON.parse(r.stdout || r.stderr) };
}
function adopt(f) {
  const result = run(f, 'plan'); assert.equal(result.status, 0, result.stderr);
  const patch = join(f.home, 'upgrade.patch'); writeFileSync(patch, result.value.patch);
  git(f.adopter, 'switch', '-c', 'codex/upgrade');
  git(f.adopter, 'apply', '--check', patch); git(f.adopter, 'apply', patch);
  // Simulated authorized Workshop applies only the separately declared skill proposal.
  for (const item of result.value.workshop) {
    put(f.adopter, item.path, readFileSync(join(f.core, item.path)));
    chmodSync(join(f.adopter, item.path), parseInt(item.expected_mode, 8));
  }
  return result.value;
}
function ready(f, changes = {}) {
  const value = { schema_version: 1, core_commit: f.ref, identity: 'consistent', authority: 'single_writer', scheduler: 'disabled', checks: Object.fromEntries(PREREQUISITES.map(p => [p, 'verified'])), ...changes };
  const path = join(f.home, 'readiness.json'); writeFileSync(path, JSON.stringify(value)); return path;
}
test('checked-in release manifest exactly describes the current portable tree', () => {
  assert.deepEqual(JSON.parse(readFileSync(join(root, MANIFEST))), generateManifest(root));
});
test('new adopter is blocked without manifest, then partial; patch is reviewable and idempotent', t => {
  const f = setup(t); assert.equal(run(f, 'check').value.status, 'BLOCKED');
  const before = git(f.adopter, 'status', '--porcelain');
  const proposal = run(f, 'plan').value;
  assert.equal(git(f.adopter, 'branch', '--show-current'), 'main');
  assert.equal(git(f.adopter, 'status', '--porcelain'), before);
  assert.equal(proposal.activation_authorized, false);
  assert.equal(proposal.workshop.length, 1);
  assert.ok(!proposal.patch.includes('diff --git a/skills/'));
  adopt(f);
  const check = run(f, 'check'); assert.equal(check.status, 1); assert.equal(check.value.status, 'PARTIAL_NOT_ACTIVE');
  const repeat = run(f, 'plan').value; assert.deepEqual(repeat.changes, []); assert.equal(repeat.patch, '');
});
test('two role-based new adopters do not inherit private configuration', t => {
  const f = setup(t);
  for (const role of ['executor-a', 'executor-b']) {
    f.adopter = join(f.home, role); init(f.adopter);
    put(f.adopter, 'projects.yaml', `private fixture binding: ${role}\n`);
    put(f.adopter, 'AGENTS.md', `private fixture policy: ${role}\n`);
    put(f.adopter, 'adopter/scheduler.json', '{"enabled":false}\n');
    adopt(f);
    assert.equal(readFileSync(join(f.adopter, 'projects.yaml'), 'utf8'), `private fixture binding: ${role}\n`);
    assert.equal(readFileSync(join(f.adopter, 'AGENTS.md'), 'utf8'), `private fixture policy: ${role}\n`);
    assert.equal(readFileSync(join(f.adopter, 'adopter/scheduler.json'), 'utf8'), '{"enabled":false}\n');
    assert.equal(run(f, 'check').value.status, 'PARTIAL_NOT_ACTIVE');
  }
});
test('current status requires pinned readiness; missing auth/project and partial membership remain inactive', t => {
  const f = setup(t); adopt(f);
  const r = run(f, 'check', ['--readiness', ready(f)]); assert.equal(r.status, 0); assert.equal(r.value.status, 'CURRENT'); assert.equal(r.value.activation_authorized, false);
  for (const missing of ['github_auth', 'linear_membership', 'project_host_binding']) {
    const checks = Object.fromEntries(PREREQUISITES.map(p => [p, p === missing ? 'missing' : 'verified']));
    const result = run(f, 'check', ['--readiness', ready(f, { checks })]);
    assert.equal(result.value.status, 'PARTIAL_NOT_ACTIVE'); assert.deepEqual(result.value.operator_prerequisites, [missing]);
  }
});
test('conflicting identity, authority and unsafe enabled scheduler block without mutation', t => {
  const f = setup(t); adopt(f);
  for (const changes of [{ identity: 'conflicting' }, { authority: 'conflicting' }, { scheduler: 'enabled', identity: 'unknown' }]) {
    const r = run(f, 'plan', ['--readiness', ready(f, changes)]); assert.equal(r.status, 2); assert.equal(r.value.status, 'BLOCKED'); assert.equal(r.value.patch, '');
  }
});
test('stale adopter upgrades from exact baseline and retains private configuration', t => {
  const f = setup(t); adopt(f); const oldRef = f.ref;
  put(f.adopter, 'projects.yaml', 'private fixture policy\n');
  put(f.core, 'scripts/check-workboard-thread-title.mjs', 'updated title contract\n');
  put(f.core, MANIFEST, JSON.stringify(generateManifest(f.core), null, 2) + '\n'); f.ref = commit(f.core);
  assert.equal(run(f, 'check').value.status, 'UPGRADE_REQUIRED');
  const p = run(f, 'plan', ['--previous-core-ref', oldRef]); assert.equal(p.status, 0, p.stderr);
  const path = join(f.home, 'update.patch'); writeFileSync(path, p.value.patch); git(f.adopter, 'apply', '--check', path); git(f.adopter, 'apply', path);
  assert.equal(readFileSync(join(f.adopter, 'projects.yaml'), 'utf8'), 'private fixture policy\n');
  assert.equal(run(f, 'check').value.status, 'PARTIAL_NOT_ACTIVE'); assert.equal(run(f, 'plan').value.patch, '');
});
test('unrecognized local edits block the entire patch without exposing contents', t => {
  const f = setup(t); adopt(f);
  put(f.adopter, 'scripts/check-workboard-thread-title.mjs', 'LOCAL CUSTOM POLICY\n');
  const r = run(f, 'plan', ['--previous-core-ref', f.ref]);
  assert.equal(r.value.status, 'BLOCKED'); assert.equal(r.value.patch, '');
  assert.ok(r.value.blockers.includes('unrecognized_local_content:scripts/check-workboard-thread-title.mjs'));
  assert.ok(!r.stdout.includes('LOCAL CUSTOM POLICY'));
});
test('legacy Core baseline permits first manifest without adopting unknown bytes', t => {
  const f = setup(t);
  unlinkSync(join(f.core, MANIFEST)); const legacy = commit(f.core);
  for (const file of generateManifest(f.core).files) {
    put(f.adopter, file.path, readFileSync(join(f.core, file.path)));
    chmodSync(join(f.adopter, file.path), parseInt(file.mode, 8));
  }
  const r = run(f, 'plan', ['--previous-core-ref', legacy]); assert.equal(r.status, 0, r.stderr);
  assert.ok(r.value.changes.includes(MANIFEST));
});
test('historical manifest omissions preserve pinned ancestry without weakening target inventory', t => {
  const f = setup(t); adopt(f);
  const rootDocs = ['README.md', 'CONTRIBUTING.md', 'RELEASE.md'];
  const manifest = generateManifest(f.core);
  manifest.files = manifest.files.filter(file => !rootDocs.includes(file.path));
  const historicalManifest = JSON.stringify(manifest, null, 2) + '\n';
  put(f.core, MANIFEST, historicalManifest);
  put(f.adopter, MANIFEST, historicalManifest);
  const previous = commit(f.core);
  f.ref = previous;
  const rejectedTarget = run(f, 'plan');
  assert.equal(rejectedTarget.status, 2);
  assert.match(rejectedTarget.value.error, /unlisted release surface:/);
  for (const path of rootDocs) put(f.core, path, `updated portable contract ${path}\n`);
  put(f.core, MANIFEST, JSON.stringify(generateManifest(f.core), null, 2) + '\n');
  f.ref = commit(f.core);
  for (const path of rootDocs) {
    const before = readFileSync(join(f.adopter, path));
    for (const change of ['edit', 'remove']) {
      if (change === 'edit') put(f.adopter, path, 'unknown adopter content\n');
      else unlinkSync(join(f.adopter, path));
      const blocked = run(f, 'plan', ['--previous-core-ref', previous]);
      assert.equal(blocked.status, 2, blocked.stderr);
      assert.equal(blocked.value.patch, '');
      assert.ok(blocked.value.blockers.includes(`${change === 'edit' ? 'unrecognized_local_content' : 'unrecognized_local_removal'}:${path}`));
      put(f.adopter, path, before);
    }
  }
  const proposal = run(f, 'plan', ['--previous-core-ref', previous]);
  assert.equal(proposal.status, 0, proposal.stderr);
  const patch = join(f.home, 'historical.patch'); writeFileSync(patch, proposal.value.patch);
  git(f.adopter, 'apply', patch);
  assert.equal(run(f, 'check', ['--readiness', ready(f)]).value.status, 'CURRENT');
  assert.equal(run(f, 'plan', ['--previous-core-ref', previous]).value.patch, '');
});
test('historical baselines still reject declared hash and mode drift', t => {
  for (const change of ['hash', 'mode']) {
    const f = setup(t);
    const manifest = generateManifest(f.core);
    manifest.files = manifest.files.filter(file => !['README.md', 'CONTRIBUTING.md', 'RELEASE.md'].includes(file.path));
    put(f.core, MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    const path = 'scripts/check-workboard-thread-title.mjs';
    if (change === 'hash') put(f.core, path, 'unhashed historical content\n');
    else chmodSync(join(f.core, path), 0o644);
    const previous = commit(f.core);
    const result = run(f, 'plan', ['--previous-core-ref', previous]);
    assert.equal(result.status, 2);
    assert.equal(result.value.error, `release ${change} mismatch: ${path}`);
  }
});
test('symlinked files and parent directories fail before following private data', t => {
  const f = setup(t); adopt(f);
  unlinkSync(join(f.adopter, 'scripts/check-workboard-thread-title.mjs'));
  symlinkSync(join(f.home, 'private-does-not-exist'), join(f.adopter, 'scripts/check-workboard-thread-title.mjs'));
  assert.equal(run(f, 'check').status, 2);
  rmSync(join(f.adopter, 'scripts'), { recursive: true }); symlinkSync(f.core, join(f.adopter, 'scripts'));
  assert.equal(run(f, 'plan').status, 2);
});
test('pinned release rejects drift, omitted files and duplicate keys', t => {
  for (const variant of ['drift', 'omitted', 'duplicate']) {
    const f = setup(t);
    if (variant === 'drift') put(f.core, 'scripts/check-workboard-thread-title.mjs', 'unhashed change\n');
    if (variant === 'omitted') put(f.core, 'scripts/hidden.mjs', 'unlisted\n');
    if (variant === 'duplicate') put(f.core, MANIFEST, readFileSync(join(f.core, MANIFEST), 'utf8').replace('"schema_version": 1', '"schema_version": 1, "schema_version": 1'));
    f.ref = commit(f.core); assert.equal(run(f, 'check').status, 2);
  }
});
test('CLI rejects mutable refs, stale readiness, unknown fields/options and duplicates', t => {
  const f = setup(t);
  for (const extra of [['--typo', 'yes'], ['--repo', f.adopter], ['--readiness', ready(f, { core_commit: '0'.repeat(40) })], ['--readiness', ready(f, { private_identity: 'forbidden' })]]) assert.equal(run(f, 'check', extra).status, 2);
  f.ref = 'main'; assert.equal(run(f, 'check').status, 2);
});
test('read-only release loader ignores working tree edits and rejects unsafe inventory paths', t => {
  const f = setup(t); put(f.core, 'scripts/check-workboard-thread-title.mjs', 'dirty\n');
  assert.equal(loadRelease(f.core, f.ref).commit, f.ref);
  const m = JSON.parse(readFileSync(join(f.core, MANIFEST))); m.files[0].path = '../projects.yaml'; put(f.core, MANIFEST, JSON.stringify(m)); f.ref = commit(f.core);
  assert.equal(run(f, 'check').status, 2);
});

test('customized or removed skills and locally removed baseline files block every patch', t => {
  for (const path of ['skills/workboard-orchestrator/SKILL.md', 'scripts/check-workboard-thread-title.mjs']) {
    for (const change of ['edit', 'remove']) {
      const f = setup(t); adopt(f); const previous = f.ref;
      put(f.core, 'ORCHESTRATOR.md', 'updated portable instructions\n');
      put(f.core, MANIFEST, JSON.stringify(generateManifest(f.core), null, 2) + '\n'); f.ref = commit(f.core);
      if (change === 'edit') put(f.adopter, path, 'private local customization\n');
      else unlinkSync(join(f.adopter, path));
      const r = run(f, 'plan', ['--previous-core-ref', previous]);
      assert.equal(r.status, 2); assert.equal(r.value.patch, '');
      assert.ok(r.value.blockers.includes(`${change === 'edit' ? 'unrecognized_local_content' : 'unrecognized_local_removal'}:${path}`));
      assert.ok(!r.stdout.includes('private local customization'));
    }
  }
});
test('existing adopter removals block without a previous Core ref, including patch output', t => {
  for (const path of ['scripts/check-workboard-thread-title.mjs', 'skills/workboard-orchestrator/SKILL.md']) {
    const f = setup(t); adopt(f);
    unlinkSync(join(f.adopter, path));
    const r = run(f, 'plan');
    assert.equal(r.status, 2); assert.equal(r.value.status, 'BLOCKED'); assert.equal(r.value.patch, '');
    assert.ok(r.value.blockers.includes(`unrecognized_local_removal:${path}`));
    const patch = spawnSync(process.execPath, [script, 'plan', '--repo', f.adopter, '--core', f.core, '--core-ref', f.ref, '--format', 'patch'], { encoding: 'utf8' });
    assert.equal(patch.status, 2); assert.equal(patch.stdout, '');
    assert.equal(run(f, 'check').value.differences.find(d => d.path === path).reason, 'missing');
  }
});
test('new release surfaces remain eligible for an existing adopter with a pinned baseline', t => {
  const f = setup(t); adopt(f); const previous = f.ref;
  put(f.core, 'docs/new-surface.md', 'new portable surface\n');
  put(f.core, MANIFEST, JSON.stringify(generateManifest(f.core), null, 2) + '\n'); f.ref = commit(f.core);
  const r = run(f, 'plan', ['--previous-core-ref', previous]);
  assert.equal(r.status, 0, r.stderr);
  const patch = join(f.home, 'new.patch'); writeFileSync(patch, r.value.patch); git(f.adopter, 'apply', patch);
  assert.equal(run(f, 'check').value.status, 'PARTIAL_NOT_ACTIVE');
});
test('recognized old skills receive separate Workshop proposals and new skills are idempotent', t => {
  const f = setup(t); adopt(f); const previous = f.ref;
  const path = 'skills/workboard-orchestrator/SKILL.md';
  put(f.core, path, 'updated Workshop contract\n');
  put(f.core, MANIFEST, JSON.stringify(generateManifest(f.core), null, 2) + '\n'); f.ref = commit(f.core);
  const r = run(f, 'plan', ['--previous-core-ref', previous]);
  assert.equal(r.status, 0, r.stderr); assert.equal(r.value.workshop[0].path, path);
  put(f.adopter, path, readFileSync(join(f.core, path)));
  assert.deepEqual(run(f, 'plan', ['--previous-core-ref', previous]).value.workshop, []);
});
test('first adoption preserves executable modes and mode-only upgrades apply idempotently', t => {
  const f = setup(t); adopt(f); const previous = f.ref;
  const path = 'scripts/check-workboard-thread-title.mjs';
  assert.ok(statSync(join(f.adopter, path)).mode & 0o111);
  chmodSync(join(f.core, path), 0o644);
  put(f.core, MANIFEST, JSON.stringify(generateManifest(f.core), null, 2) + '\n'); f.ref = commit(f.core);
  assert.equal(run(f, 'check', ['--readiness', ready(f)]).value.status, 'UPGRADE_REQUIRED');
  const r = run(f, 'plan', ['--previous-core-ref', previous]); assert.equal(r.status, 0, r.stderr);
  const patch = join(f.home, 'mode.patch'); writeFileSync(patch, r.value.patch); git(f.adopter, 'apply', patch);
  assert.equal(statSync(join(f.adopter, path)).mode & 0o111, 0);
  assert.equal(run(f, 'check', ['--readiness', ready(f)]).value.status, 'CURRENT');
  assert.equal(run(f, 'plan').value.patch, '');
  chmodSync(join(f.adopter, path), 0o755);
  assert.equal(run(f, 'plan', ['--previous-core-ref', f.ref]).value.status, 'BLOCKED');
});
test('pinned release rejects executable mode drift', t => {
  const f = setup(t); chmodSync(join(f.core, 'scripts/check-workboard-thread-title.mjs'), 0o644); f.ref = commit(f.core);
  assert.equal(run(f, 'check').status, 2);
});
test('owner execute removal changes conformance and generated Git modes', t => {
  const f = setup(t); adopt(f); const previous = f.ref;
  const path = 'scripts/check-workboard-thread-title.mjs';
  assert.equal(run(f, 'check', ['--readiness', ready(f)]).value.status, 'CURRENT');
  for (const repo of [f.adopter, f.core]) {
    const chmod = spawnSync('chmod', ['u-x', join(repo, path)], { encoding: 'utf8' });
    assert.equal(chmod.status, 0, chmod.stderr);
    assert.equal(statSync(join(repo, path)).mode & 0o777, 0o655);
  }
  const check = run(f, 'check', ['--readiness', ready(f)]);
  assert.equal(check.value.status, 'UPGRADE_REQUIRED');
  assert.equal(check.value.differences.find(d => d.path === path).actual_mode, '100644');
  const plan = run(f, 'plan', ['--previous-core-ref', f.ref]);
  assert.equal(plan.status, 2); assert.equal(plan.value.patch, '');
  assert.ok(plan.value.blockers.includes(`unrecognized_local_content:${path}`));
  const generated = spawnSync(process.execPath, [script, 'manifest', '--repo', f.core], { encoding: 'utf8' });
  assert.equal(generated.status, 0, generated.stderr);
  assert.equal(JSON.parse(generated.stdout).files.find(file => file.path === path).mode, '100644');
  put(f.core, MANIFEST, generated.stdout); f.ref = commit(f.core);
  assert.match(git(f.core, 'ls-tree', f.ref, path), /^100644 blob /);
  const proposal = run(f, 'plan', ['--previous-core-ref', previous]); assert.equal(proposal.status, 0, proposal.stderr);
  const patch = join(f.home, 'owner-mode.patch'); writeFileSync(patch, proposal.value.patch);
  git(f.adopter, 'apply', patch);
  assert.equal(run(f, 'check', ['--readiness', ready(f)]).value.status, 'CURRENT');
});
test('complete first adoption satisfies the real capability consumer and requires root evidence', t => {
  const f = setup(t);
  for (const path of ['README.md', 'CONTRIBUTING.md', 'RELEASE.md']) unlinkSync(join(f.core, path));
  for (const file of generateManifest(root).files) {
    put(f.core, file.path, readFileSync(join(root, file.path)));
    chmodSync(join(f.core, file.path), parseInt(file.mode, 8));
  }
  put(f.core, MANIFEST, JSON.stringify(generateManifest(f.core), null, 2) + '\n'); f.ref = commit(f.core);
  adopt(f);
  const result = spawnSync(process.execPath, [join(f.adopter, 'scripts/check-workboard-capabilities.mjs'), '--repo', f.adopter], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const consumerEnv = { ...process.env };
  delete consumerEnv.NODE_TEST_CONTEXT;
  const consumers = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/upstream-sync.test.mjs', 'tests/task-execution-profile.test.mjs', 'tests/model-routing.test.mjs'], { cwd: f.adopter, encoding: 'utf8', env: consumerEnv });
  assert.equal(consumers.status, 0, consumers.stdout + consumers.stderr);
  const total = Number(consumers.stdout.match(/^# tests (\d+)$/m)?.[1]);
  const passed = Number(consumers.stdout.match(/^# pass (\d+)$/m)?.[1]);
  const skipped = Number(consumers.stdout.match(/^# skipped (\d+)$/m)?.[1]);
  const failed = Number(consumers.stdout.match(/^# fail (\d+)$/m)?.[1]);
  const cancelled = Number(consumers.stdout.match(/^# cancelled (\d+)$/m)?.[1]);
  assert.ok(passed > 0, consumers.stdout + consumers.stderr);
  assert.equal(failed, 0, consumers.stdout + consumers.stderr);
  assert.equal(cancelled, 0, consumers.stdout + consumers.stderr);
  assert.equal(passed + skipped, total, consumers.stdout + consumers.stderr);
  t.diagnostic(`Shipped consumers executed and passed ${passed} tests; ${skipped} skipped.`);
  assert.equal(run(f, 'check', ['--readiness', ready(f)]).value.status, 'CURRENT');
  for (const path of ['README.md', 'CONTRIBUTING.md', 'RELEASE.md', 'ORCHESTRATOR.md', 'projects.example.yaml']) {
    unlinkSync(join(f.adopter, path));
    const r = run(f, 'check', ['--readiness', ready(f)]);
    assert.equal(r.value.status, 'UPGRADE_REQUIRED'); assert.ok(r.value.differences.some(d => d.path === path));
    put(f.adopter, path, readFileSync(join(f.core, path)));
  }
});
