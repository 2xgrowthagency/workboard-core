#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

function read(relativePath) {
  return readFileSync(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    'utf8',
  );
}

const guide = read('docs/new-workboard-initialization.md');
const operatorTemplate = read('templates/local-operator-setup.md');
const initializationRecord = read('templates/workboard-initialization-record.md');
const onboarding = read('docs/team-onboarding.md');
const linearContract = read('docs/linear-single-writer.md');

test('initialization guide uses an independent private repository with auditable Core ancestry', () => {
  assert.match(guide, /Create a new private repository from Core\. Do not fork by default\./);
  assert.match(guide, /Fork ancestry is not required/);
  assert.match(guide, /git remote rename origin core/);
  assert.match(guide, /Core commit or release/);
  assert.match(guide, /check-workboard-capabilities\.mjs/);
});

test('initialization keeps controller and local-operator responsibilities generic', () => {
  assert.match(guide, /Root controller.*owns queue synchronization/);
  assert.match(guide, /Local operator.*configures local paths/);
  assert.doesNotMatch(guide, /\b(?:Orion|Zaid|Zain|Dennis|Donna|Clara)\b/);
  assert.match(guide, /Never run two controllers or a controller and local Codex automation as/);
  assert.match(guide, /paused manual fallback/);
  assert.match(guide, /thread-hygiene automation may remain active/);
  assert.match(operatorTemplate, /fallback queue poll must remain paused/);
});

test('first task is a bounded dispatch smoke with duplicate and callback proof', () => {
  assert.match(guide, /first packet on every new Workboard must be a harmless dispatch smoke test/);
  assert.match(guide, /SMOKE_TEST_OK/);
  assert.match(guide, /Exactly one worker is created/);
  assert.match(guide, /second poll while the task is claimed creates no duplicate worker/);
  assert.match(guide, /completion callback/);
  assert.match(guide, /moves the packet to `tasks\/review\/`/);
  assert.match(guide, /only then moves the packet to `tasks\/done\/`/);
  assert.match(guide, /scheduled polling path completed its own smoke test/);
  assert.match(initializationRecord, /Initial Dispatch Smoke/);
  assert.match(initializationRecord, /Scheduled Poll Smoke/);
  assert.match(initializationRecord, /Callback lane: `tasks\/review\/`/);
  assert.match(initializationRecord, /Reviewed final lane: `tasks\/done\/`/);
});

test('team onboarding separates training from production activation', () => {
  assert.match(onboarding, /Training sandbox/);
  assert.match(onboarding, /Use \$workboard-control-cycle/);
  assert.match(onboarding, /Keep every recurring scheduler paused/);
  assert.match(onboarding, /Manual dispatch canary/);
  assert.match(onboarding, /Scheduled-path canary/);
  assert.match(onboarding, /Exit criteria/);
  assert.match(onboarding, /ordered by Priority/);
  assert.match(onboarding, /first\s+eligible unlocked ticket from the top down/);
  assert.match(linearContract, /Urgent, High, Medium, Low, then No priority/);
  assert.match(linearContract, /manual drag position.*not an authoritative scheduling signal/s);
});
