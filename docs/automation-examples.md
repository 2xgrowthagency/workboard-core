# Automation Examples

## Adopter release proposals

On an operator-requested release check, run `scripts/workboard-adopter.mjs plan`
with an explicit adopter review root, Core root and immutable Core commit.
Review JSON blockers and Workshop proposals before generating the patch. Reuse
one upgrade PR per adopter/release. Follow `docs/adopter-readiness.md` for exact
commands and private registry ownership; this discovery path creates no recurring
poller and grants no activation or live queue authority.

These are starting points. Edit paths, project names, cadence, and model settings for your own setup.

For app-native stalls, stale UI, callback delivery, saved-project/path,
specialist-tool, or Git failures, use `docs/known-issues-and-recovery.md` before
retrying or changing surfaces.

## Production-Derived Upgrade Validation

When an automation or operational clone proves a reusable improvement, do not
copy its host-local configuration into the starter. Generalize the behavior and
update the protocol, portable skill, task template, automation examples, focused
tests, and compatibility/migration record together.

Reconcile and validate the machine-readable protocol inventory before running
the synchronization gate:

```bash
node scripts/check-workboard-capabilities.mjs \
  --repo <WORKBOARD_STARTER_ROOT> \
  --refresh-evidence
git diff -- workboard-capabilities.json
node scripts/check-workboard-capabilities.mjs --repo <WORKBOARD_STARTER_ROOT>
```

Refresh only after reviewing the capability status, version, and evidence list.
The digest command records deliberate synchronization; it does not prove the
claim by itself.

Run the offline gate with caller-supplied clone inputs:

```bash
node scripts/check-upstream-sync.mjs \
  --repo <WORKBOARD_STARTER_ROOT> \
  --base <LOCAL_BASE_REF> \
  --record docs/releases/<UPGRADE_RECORD>.md
```

The release record's downstream adoption reference must point to the originating
public starter issue or release. This works in independently customized clones;
the check does not fetch, inspect remotes, or require fork ancestry. See
`docs/upstream-synchronization.md` for the portability boundary.

For read-only clone inventory, run only the capability validator without
`--refresh-evidence`. `CAPABILITY_MANIFEST_STATUS=VALID` reports schema,
protocol, supported, and total capability counts. `REJECTED` or `CHECK_FAILED`
must stop any automation that depends on a declared optional capability.

## Generic root-orchestrator prompt

Prefer the shared entrypoint when the host supports installed skills:

```text
Use $workboard-control-cycle to run one fail-closed Workboard control cycle through the installed adopter profile.
```

Keep cadence, enabled state, project, target thread, execution environment,
model, reasoning, host, and notifications in automation metadata. The expanded
prompt below remains a portable fallback and audit reference, not text to copy
into every saved automation.

```text
Run one Workboard orchestrator polling cycle.

Workboard repo: <LOCAL_PATH_TO_WORKBOARD>

Instructions:
1. Run: node scripts/check-workboard-git-preflight.mjs --repo <LOCAL_PATH_TO_WORKBOARD>. The path must resolve to the exact repository root; symlink and .. aliases resolving to that root are accepted, while nested directories are rejected.
2. Continue only on GIT_PREFLIGHT_STATUS=READY or GIT_PREFLIGHT_STATUS=UPDATED; stop and report the exact REASON/DETAIL for GIT_PREFLIGHT_STATUS=STOP. STOP REASON=INTERRUPTED is final and requires a fresh run. The preflight lock coordinates compliant roots only: never auto-expire it, use explicit verified recovery for an abandoned lock, and retain one-root/single-writer discipline against external writers.
3. Before broad reads, run: node scripts/check-workboard-queue.mjs --repo <LOCAL_PATH_TO_WORKBOARD> --capacity <MAX_ACTIVE_TASKS> --run-memory <EXTERNAL_STATE_PATH>/poll.json --idle-pause-threshold <NO_ACTION_RUNS> --idle-pause-action <recommend|pause>. The classifier independently requires that canonical root identity without invoking Git. Omit capacity only for the default of 8; omit all idle-control flags for a stateless manual poll.
4. Stop on WORKBOARD_REQUIRES_JUDGMENT or CHECK_FAILED.
5. Stop on NOTHING_TO_CLAIM after reporting the preflight HEAD and classifier line. Do not read packet bodies, project registries, non-routable lanes, thread history, or old automation narratives.
6. On WORK_IN_PROGRESS, report the preflight HEAD and classifier line, then stop without reading active packets or worker history. This includes ready work waiting at full capacity.
7. For a routable lane, read projects.yaml, docs/orchestrator-protocol.md, and only the packet lane required by the classifier result.
8. Trust the classifier's machine-enforced capacity result; do not route when AVAILABLE_CAPACITY=0.
9. If ready work exists and capacity remains, decode the emitted locks and use scripts/check-workboard-target-lock.mjs for every candidate. Reject exact target_project_id + target_path matches; continue routing unrelated targets.
10. For every v2 move, update only known schema fields, append one complete exact state transition block, and run scripts/check-task-packet.mjs against the destination lane and previous log state. Reject unknown/duplicate keys or log fields, partial trailing logs, noncanonical packet/dependency IDs, abbreviated commit SHAs, user-specific absolute paths, and malformed state metadata. On claim, pin the immutable target and exact lock tuple. Legacy --allow-legacy is read-only migration evidence, not permission to move an old packet. Commit/push validated claim transitions before delegation.
11. Resume an existing canonical task in its current environment. Otherwise resolve the task execution profile from packet intent, verified Cloud preference, project default, then the portable fallback: Cloud only with a named ready environment; Git implementation and independent QA use Worktree; non-Git, host/runtime, and Workboard root/queue work use Local. Explicit or resolved Local requires execution_environment_reason. Persist resolved_execution_environment before claim. Separately resolve model routing from packet override, project override, then the portable gpt-5.6-sol medium default. Run scripts/check-model-routing.mjs for overrides or escalation. High requires exactly high_stakes, security_sensitive, repeatedly_blocked, or unusually_complex. Luna Medium requires bounded_high_volume plus independent_verification=true. Record cloud environment, variable, and secret names only—never values. Keep task_state_authority explicit with state_update_policy: single_writer; do not dual-write. Linear authority additionally requires a concrete adapter certified against scripts/linear-single-writer.mjs, stable member-ID binding, serialized admission, fresh capacity and target-lock readback, incident-bound recovery, canonical worker and verifier readback, replay protection, and the full docs/linear-single-writer.md canary sequence. Order eligible Linear Ready issues independently of connector return order: Urgent, High, Medium, Low, then No priority; oldest created first within one priority. Claim the first unlocked issue from the top down. Missing ordering fields fail closed. Manual drag position is not authoritative; change Linear Priority to change execution order.
12. Before every actual creation call, mint and persist a new worker_creation_attempt_id, then follow docs/live-task-visibility.md: use app-native project/task create, list, and read tools when exposed and record the exact `app-native task tools` creation surface; otherwise use the explicit portable_only fallback. Verify saved-project binding, target project root, resolved execution mode, execution cwd kind, and canonical task identity. A managed worktree cwd may differ from target_path. Write canonical identity only after complete live proof; keep recovery_id stable across an incident while replacement gets a new attempt ID.
13. Never periodically inspect, monitor, heartbeat, or babysit active workers or QA tasks. Reconcile only callbacks whose worker task ID and creation attempt ID match the source packet's current canonical pair after verified visibility.
14. Route QA-required completions to tasks/qa, QA-not-required completions to tasks/review, and exact blockers to tasks/blocked. Preserve a relative or `${WORKBOARD_ROOT}` QA artifact root, exact `<root>/<packet-id>` directory, immutable target type/value, active/completed qa_thread_id, paired full-SHA prior QA head and exact result, callback source/handoff, and GitHub receipts bound to packet repo plus positive numeric issue/PR ID.
15. On QA_RESULT_AVAILABLE, reconcile the recorded verdict without launching duplicate QA.
16. Launch separate QA tasks only for pending QA and route PASS to review, FAIL to ready, or BLOCKED to blocked.
17. Before declaring a linked PR merge-ready, apply docs/github-codex-review-gate.md. Independent QA and the GitHub-hosted Codex review must both apply to the exact current PR head. Pending, unreadable, wrong-head, or valid-unresolved hosted findings block merge when review is required. Route valid findings to the builder, record evidence for invalid findings, and rerun both gates after every fixing commit. QA remains read-only.
18. Require every builder/QA task to send exactly one final callback to root_task_id with packet ID, result, canonical worker_thread_id as callback worker_task_id, unchanged worker_creation_attempt_id, exact structured immutable proof equal to the applicable pinned packet target, and exact next lane: ready_for_qa->tasks/qa, ready_for_review or pass->tasks/review, fail->tasks/ready, blocked->tasks/blocked. Commit targets use `type=commit|source=<target_commit|qa_prior_head>|sha=<lowercase-40-character-sha>`; artifact, URL, or path targets use `type=<artifact|url|path>|source=<immutable_target|qa_prior_head>|value=<exact-value>`.
19. Structurally reject duplicate source frontmatter keys, then run scripts/check-workboard-callback.mjs with canonical source handoff kind, packet qa_required, source worker_creation_status, and source completion_callback_status. Only exact pending callback status with canonical creation can return ROUTABLE and permit one bounded canonical-task read and lane move. RECOVERY_EVIDENCE from replayed/non-pending callbacks or mismatched/delayed task or attempt IDs cannot route. Callback failure must emit ROOT_RECONCILIATION_REQUIRED with the same envelope; never start monitoring.
20. On PROMOTION_REVIEW_NEEDED, follow docs/dependency-promotion.md. Promote auto candidates from dependency metadata only; open each review candidate for exactly one ready_when check; do not reconsider manual or human/external blockers without new proof.
21. If IDLE_PAUSE_REQUESTED=1, call the host's native automation pause operation and verify paused state before reporting success. If IDLE_PAUSE_RECOMMENDED=1 and request is 0, report only a recommendation. Ready or pending-QA inventory must never be paused by this control.
22. Commit/push every promotion transition before rerunning queue classification. After recovery, rerun dependency promotion and queue classification, preserve its validated rerun receipts, then commit/push the recovery transition.
23. Only after the cycle's final outcome is known, set the root title to `[idle|claimed|qa|review|blocked|done] <useful project or task label>`. Final `[poll]` titles are invalid. Token/phrase-aware validation rejects labels beginning with WB, Workboard, poll/polling, queue check, or manual Workboard, and labels made only of generic closeout/check/status words; it permits those character sequences inside larger real names. For standalone closeout, obtain the current task UUID only from process.env.CODEX_THREAD_ID and pass it as --title-task-id; reject missing/malformed/mismatched identity and never use task list/search or history discovery. Persistent-root heartbeats are exempt. Read the exact title back through the app-native task surface before reporting success; otherwise report the exact unavailable tool, failed call, timeout/error, or requested-versus-observed mismatch.
24. For every verified builder, QA, or canonical task-creation recovery response, report the raw canonical task ID plus exactly the clickable `::created-thread{threadId="<RAW_TASK_ID>"}` directive with the same ID after app-native readback. Reject all other directive/link forms.

Stop before secrets, destructive actions, production data, deployments, account/billing settings, or ambiguous acceptance criteria.
```

## Packet transition example

When a builder callback routes a packet from active work into QA, update the
metadata and append the transition before moving the file:

```text
status: qa
target_commit: 0123456789abcdef0123456789abcdef01234567
immutable_target_type: commit
immutable_target: 0123456789abcdef0123456789abcdef01234567
target_lock_status: held
qa_status: pending
qa_artifacts_root: ${WORKBOARD_ROOT}/qa-artifacts
qa_artifacts_dir: ${WORKBOARD_ROOT}/qa-artifacts/20260717-001-example
qa_immutable_target_type: commit
qa_immutable_target: 0123456789abcdef0123456789abcdef01234567
callback_source_task_id: <canonical-builder-task-id>
qa_publication_status: pending
qa_publication_receipts: []
```

```text
STATE: qa
FROM: active
SUMMARY: Builder completed and independent QA is queued.
PROOF: commit:0123456789abcdef0123456789abcdef01234567; callback:<receipt-id>
BLOCKER: none
NEXT: Create one read-only QA companion against the pinned commit.
UPDATED_AT: 2026-07-17T12:00:00Z
```

```bash
node scripts/check-task-packet.mjs tasks/qa/20260717-001-example.md \
  --lane qa --previous-status active
```

## Idle and pause controls

Use one state file per scheduled automation, outside the Workboard checkout. The
file is machine-owned one-line JSON; do not append summaries or read historical
automation prose to recover the streak. Create its external parent directory
once during automation setup; the classifier creates or atomically replaces the
file itself.

Recommendation-only example:

```bash
node scripts/check-workboard-queue.mjs \
  --repo <LOCAL_PATH_TO_WORKBOARD> \
  --capacity 8 \
  --run-memory <EXTERNAL_STATE_PATH>/poll.json \
  --idle-pause-threshold 4 \
  --idle-pause-action recommend
```

Automatic-pause example:

```bash
node scripts/check-workboard-queue.mjs \
  --repo <LOCAL_PATH_TO_WORKBOARD> \
  --capacity 8 \
  --run-memory <EXTERNAL_STATE_PATH>/poll.json \
  --idle-pause-threshold 4 \
  --idle-pause-action pause
```

The second form emits `IDLE_PAUSE_REQUESTED=1` at the threshold. That is a
request, not a successful mutation. The automation host must pause the exact
current schedule through its supported API and read it back as paused. If the
pause API is absent, times out, or readback remains active, report that exact
blocker and leave the real automation state unchanged in the closeout. A host
without pause support should use `recommend`.

The streak counts only stable idle and claimed/active-QA-only snapshots. Any
actionable lane or changed no-action queue signature resets it. In particular,
ready work waiting at capacity suppresses pause so a paused schedule cannot hide
work that becomes routable when capacity opens.

## Optional Codex task finalization

After the queue outcome and any routing/promotion work are complete, a separate
local hygiene automation may classify exact Codex automation sessions:

```bash
node scripts/classify-codex-task-finalizer.mjs \
  --session <EXPLICIT_LOCAL_ROLLOUT_JSONL> \
  --automation-id <EXACT_AUTOMATION_ID> \
  --automation-name <EXACT_AUTOMATION_NAME> \
  --limit 25
```

Follow [`codex-task-finalization.md`](codex-task-finalization.md). The script is
read-only and emits canonical `codex-task-finalizer/v1` JSONL candidates only.
Parse each complete line with `parseFinalizerJsonLine`; use only raw parsed
`thread_id`, `title`, and `action`. Never split `key=value` tokens, URL-decode
fields, or apply serialized/percent-encoded text as a task title. Require the first user message's exact
configured automation ID/name pair and preserve every later non-heartbeat user
message, including an identical repeated trigger. Rename/archive only exact emitted task IDs
through app-native tools, read back every step, stop on duplicate/conflicting
results, and preserve all manual follow-ups, useful errors, blockers, review or
delegation evidence, and canonical worker proof. Do not scan implicit session
roots, assume a user-specific database path, edit SQLite, or hard-delete tasks.

## Codex Desktop pattern

Create a saved Codex project for the Workboard repo and saved projects for each
target repo. Schedule or manually run the generic root-orchestrator prompt in
the Workboard project. Worker tasks belong in the exact target project, not the
Workboard project, unless the packet is explicitly Workboard/control-plane work.
Projectless routing remains separate from Local versus Worktree.

When the host exposes app-native APIs, list projects and select the exact saved
target, resolve Local versus Worktree, persist `worker_creation_attempt_id`,
create at most one task for that attempt, then use the live list/read tools to
verify one candidate's exact title, saved project/target root, resolved mode,
execution cwd kind, host/local identity, and complete handoff. A managed
worktree cwd normally differs from the project root. Only then
write the candidate ID to canonical `worker_thread_id`, mark visibility
`verified`, and report that raw ID plus exactly
`::created-thread{threadId="<RAW_TASK_ID>"}` with the same ID. Reject
`::codex-thread`, URLs, malformed/extended directives, extra text/IDs, and
multiple directives.

Do not treat a helper, separate app server, session index, or database row as
proof that Desktop refreshed. On a stall, timeout, ambiguous result, or mismatch,
record the exact call and partial result, preserve any raw ID, create no
duplicate, and keep the source packet claimed with its target lock and capacity
slot active. Set visibility `ambiguous` and recovery pending; do not claim
successful delegation. Move to blocked only after recovery proves ambiguity
resolved and no usable/canonical worker remains, with an exact next action.

Raw/replacement IDs remain recovery evidence until canonical writeback. Delayed
or noncanonical callbacks also remain recovery evidence: they cannot route
unless both worker task ID and creation attempt ID match the source packet.

When an app-native create call has an ambiguous outcome, use app-native task list
and read calls on that same surface before any retry. Returned IDs and partial
responses belong in the recovery packet even when the create call itself errors.

At root closeout, choose the final state and useful project/task label before
calling the title tool. Read the task back and compare the exact title. A
missing tool, failed/timeout call, or mismatch is an exact blocker, not a
successful rename. A heartbeat in an intentionally persistent root task may
retain an unchanged useful state-first title only with recorded exception proof
and exact app-native readback; this does not authorize worker heartbeats.

Use `node scripts/check-workboard-closeout.mjs` to reject early/generic titles,
unverified title claims, vague title blockers, and mismatched delegation links.
Before recording a Linear-backed implementation or QA task as canonical, also
validate its immutable issue-first title and exact app-native readback:

```bash
node scripts/check-workboard-thread-title.mjs \
  --linear-key "<TEAM-123>" \
  --role "<implementation|qa>" \
  --label "<SHORT_LABEL>" \
  --title "<REQUESTED_TITLE>" \
  --title-readback "<EXACT_APP_NATIVE_READBACK>"
```

Implementation uses `[TEAM-123] <short label>`; QA uses
`[qa][TEAM-123] <short label>`. Do not create a replacement task solely to fix
a title; rename the canonical task in place when app-native mutation and exact
readback are available.

For example, a verified delegation closeout can be checked with:

```bash
node -e 'const id=process.env.CODEX_THREAD_ID||"";if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)){console.error("invalid CODEX_THREAD_ID");process.exit(1)};console.log(id)'
node scripts/check-workboard-closeout.mjs \
  --state claimed \
  --label "<USEFUL_PROJECT_OR_TASK_LABEL>" \
  --outcome-known true \
  --title-status verified \
  --title "[claimed] <USEFUL_PROJECT_OR_TASK_LABEL>" \
  --title-readback "[claimed] <USEFUL_PROJECT_OR_TASK_LABEL>" \
  --title-task-id "$CODEX_THREAD_ID" \
  --delegated true \
  --task-id "<RAW_TASK_ID>" \
  --task-link '::created-thread{threadId="<RAW_TASK_ID>"}' \
  --task-readback verified
```

## Claude Desktop pattern

Create a Claude project for Workboard and one project per target workspace/repo. The Workboard project runs the root loop. For each claimed packet, start a worker chat in the correct target project and paste the packet plus the worker handoff prompt from `docs/orchestrator-protocol.md`.

## Claude Code / Codex CLI pattern

Run the root loop from the Workboard repo. For each claimed packet, start a separate terminal/session from the packet `target_path` and provide the full packet plus worker handoff. Keep each worker scoped to one packet.

This is the portable fallback when app-native project/task APIs are not exposed.
Set `worker_visibility_status: portable_only`, record the session identity in
`worker_portable_session_id` plus cwd/handoff evidence, leave canonical
`worker_thread_id` empty, and state that live Desktop visibility and canonical
callback routing were not verified.

Example shell shape:

```bash
cd /path/to/workboard
node scripts/check-workboard-git-preflight.mjs --repo "$PWD"
# stop unless GIT_PREFLIGHT_STATUS is READY or UPDATED
node scripts/check-workboard-queue.mjs --repo "$PWD" --capacity 8
# root agent opens only the lane required by the classifier

cd /path/to/target-project
# start Claude Code, Codex CLI, or another local worker with the packet prompt
```

## Cloud worker dispatch

After the root has claimed a packet, resolved `resolved_execution_environment:
cloud`, and committed/pushed the target branch, use the Cloud adapter available
in the operator's environment. The starter does not ship an account-specific
Cloud API/CLI adapter. Whatever adapter is used must emit or provide the values
needed for the packet's machine-readable receipt rather than pretending the
Cloud transcript is the local worker thread:

```bash
"$CLOUD_ADAPTER" submit \
  --target-repository "$TARGET_REPOSITORY" \
  --target-branch "$PUSHED_BRANCH" \
  --target-commit "$FULL_COMMIT_SHA" \
  --environment-id "$CODEX_ENVIRONMENT_ID" \
  --prompt-file "$CLOUD_PROMPT_FILE"
```

Record the returned task ID, URL, branch, commit, and dispatch status in the
packet, then use the same adapter's equivalent operations for status, diff, or
apply. Do not pass the packet to a worker-capable adapter because only the local
root may mutate packet state. The
environment ID is an account/runtime input, not a secret; environment-variable
and secret values stay in Codex settings and never enter the packet or prompt.
