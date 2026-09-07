---
packet_schema_version: 2
# Adopter upgrades retain v2; attach pinned Core conformance and migration proof
# using existing evidence fields. Code availability never grants activation.
id: YYYYMMDD-001-short-slug
status: ready
priority: P2
created_by: <human-or-agent-name>
created_at: YYYY-MM-DDTHH:MM:SSZ
backlog_reason:
promotion_policy: manual
dependency_ready_state: done
blocker_type:
depends_on: []
unblocks: []
ready_when:
task_state_authority: workboard
linear_issue_key:
state_update_policy: single_writer
claimed_by:
claimed_at:
root_task_id:
root_closeout_title:
root_closeout_title_status: pending
root_closeout_title_proof:
root_closeout_title_blocker:
worker_thread_id:
builder_thread_id:
worker_task_title:
worker_creation_surface:
worker_creation_attempt_id:
worker_creation_status: pending
worker_creation_proof:
worker_portable_session_id:
worker_task_link:
worker_host_identity:
worker_visibility_status: pending
worker_visibility_verified_at:
worker_visibility_proof:
worker_routing_blocker:
recovery_id:
recovery_status: not_required
recovery_pending: false
dispatch_mode: pending
callback_source_task_id:
callback_handoff_required: true
completion_callback_status: pending
completion_callback_result:
completion_callback_worker_task_id:
completion_callback_worker_creation_attempt_id:
completion_callback_immutable_proof:
completion_callback_next_lane:
completion_callback_sent_at:
completion_callback_error:
max_runtime_minutes: 90
requires_network: true
requires_auth: false
requires_local_gui: false
requires_browser: false
requires_computer_use: false
requires_google_drive: false
requires_google_docs: false
requires_screenshot: false
required_skills: []
qa_required: false
qa_status: not_required
qa_codex_project:
qa_model:
qa_reasoning:
qa_model_routing_reason_category:
qa_model_routing_reason_note:
qa_luna_eligibility:
qa_independent_verification: false
qa_requires_browser: false
qa_requires_computer_use: false
qa_artifact_policy: local_paths_only
qa_artifacts_root: ${WORKBOARD_ROOT}/qa-artifacts
qa_artifacts_dir:
qa_immutable_target_type: none
qa_immutable_target:
qa_prior_head:
qa_prior_result:
qa_thread_id:
qa_result:
qa_publish_to_github: auto
qa_worker_notification_policy: on_failure_or_no_github
qa_publication_status: not_required
qa_github_comment_urls: []
qa_publication_receipts: []
qa_worker_notification_status: not_required
target_commit:
immutable_target_type: none
immutable_target:
target_lock_status: unlocked
target_lock_project_id:
target_lock_path:
target_lock_acquired_at:
target_lock_released_at:
repo:
github_issue:
github_pr:
target_project_id: workboard
target_project_name: Workboard
target_path: ${WORKBOARD_ROOT}
execution_environment: auto
resolved_execution_environment: pending
execution_environment_reason:
cloud_environment_name:
cloud_readiness: not_required
cloud_setup_contract: unknown
cloud_network_access: off
cloud_env_vars: []
cloud_secret_names: []
cloud_blocker:
cloud_dispatch_status: not_requested
cloud_task_id:
cloud_task_url:
cloud_task_branch:
cloud_task_commit:
cloud_task_last_checked_at:
cloud_dispatch_result:
root_model:
root_reasoning:
root_model_routing_reason_category:
root_model_routing_reason_note:
root_luna_eligibility:
root_independent_verification: false
worker_model:
worker_reasoning:
worker_model_routing_reason_category:
worker_model_routing_reason_note:
worker_luna_eligibility:
worker_independent_verification: false
publication_status: not_required
publication_receipts: []
archive_reason:
branch_policy: create_branch
allowed_actions: [inspect, edit, test]
forbidden_actions: [merge, publish, deploy, destructive_data_change, secrets]
parallel_safe: false
---

# Task: <short title>

> Scheduled control-cycle layering changes no packet fields. The shared base,
> adopter profile, and machine bindings must still produce this exact packet
> and proof contract.

## Objective

State the outcome in plain language.

## Context

Include task-local context only: links to issues, docs, screenshots, examples, acceptance notes, and relevant prior decisions. Do not paste private memory, credentials, auth tokens, customer exports, or raw sensitive data.

## Scope

### In scope

- 

### Out of scope

- 

## Suggested starting points

- Target project ID:
- Target path:
- Repo/branch:
- Files likely involved:
- Related docs/issues:

## Acceptance criteria

- [ ] 

## Required proof

- [ ] Tool/capability proof if `requires_*` or `required_skills` is set
- [ ] Live task readback proof, retained-lock recovery proof, or an explicit `portable_only` visibility status
- [ ] Current working directory and git branch/HEAD captured
- [ ] Execution environment resolution and app-native Local/Worktree readback captured
- [ ] Commands/tests run, with result
- [ ] Diff/PR/commit link, if code changed
- [ ] Screenshot/browser proof, if UI-facing
- [ ] Autoreview/review result for non-trivial code changes, or reason skipped
- [ ] For a production-derived starter upgrade: synchronized protocol, portable skill, packet template, automation examples, focused tests, compatibility/migration record, and public starter issue/release adoption backlink validated with `scripts/check-upstream-sync.mjs`
- [ ] For a starter capability change: `workboard-capabilities.json` status/version/evidence reconciled, evidence digests refreshed and reviewed, and `scripts/check-workboard-capabilities.mjs` passed
- [ ] Independent QA result and artifact paths when `qa_required: true`
- [ ] For a linked PR with required GitHub-hosted Codex review: exact reviewed head, terminal run/check status, finding classifications, resolution evidence, and no valid unresolved findings
- [ ] Caveats documented
- [ ] Canonical worker ID/proof and matching creation-attempt ID recorded after any creation recovery
- [ ] Exactly one completion callback receipt, or a `ROOT_RECONCILIATION_REQUIRED` marker with identical proof
- [ ] Final root title applied only after outcome and verified by app-native readback, or exact title blocker recorded
- [ ] Every builder, QA, and canonical recovery response records raw task ID plus exact same-ID `::created-thread` directive

## Stop and ask if

- A secret, account setting, billing setting, production data, destructive action, deployment, or ambiguous product decision is required.
- The target path/project does not match the registry.
- Acceptance criteria cannot be verified with the available tools.

## Orchestration notes

### Execution profile

Every new packet declares one execution profile alongside its model route:

- `execution_environment` is intent: `auto`, `cloud`, `worktree`, or `local`.
- `resolved_execution_environment` is persisted before claim. `auto` prefers a
  verified Codex Cloud environment when the project allows it, then falls back
  to Worktree-for-Git or Local-for-host/auth/GUI work.
- Cloud packets record the environment name, readiness, network policy, and
  names of required variables/secrets only. Values belong in Codex Cloud
  settings; secrets are available to setup but are removed before the agent
  phase.
- `task_state_authority` defaults to `workboard`. A Linear-authoritative task
  must carry a `linear_issue_key`, use a certified concrete adapter, and cannot
  have a mirrored file in any Workboard task lane. Stable identity, capacity,
  recovery, callback, and independent-QA rules live in
  `docs/linear-single-writer.md`.
- Linear-authoritative Ready issues are ordered independently of connector
  return order: Urgent, High, Medium, Low, then No priority; oldest created
  first within one priority. Root claims the first eligible unlocked issue.
  Missing ordering fields fail closed. Manual drag position is not authoritative;
  change Linear Priority to change execution order.

- This template is compatible with Workboard protocol `1.0.0`. In customized clones, validate `workboard-capabilities.json` before assuming an optional capability is present; rejected metadata is unknown state, not proof of support.
- Validate this packet before every move with `node scripts/check-task-packet.mjs <packet> --lane <destination-lane> --previous-status <current-log-state>`. The destination directory, frontmatter `status`, and latest state log must agree.
- `packet_schema_version: 2` is fail-closed. Every frontmatter key must belong to the v2 schema, packet/dependency IDs use `YYYYMMDD-NNN-lowercase-slug`, commit values use the full lowercase 40-character SHA, and every state-log line must belong to one complete seven-field block. Legacy packets require an explicit, one-run `--allow-legacy` validation and should be migrated before mutation; do not mix legacy `orchestrator_*` aliases with v2 `root_*` fields.
- Root owns dependency promotion. Workers report completion proof but do not move downstream packets.
- `promotion_policy: auto` requires `ready_when: dependencies_satisfied` and reciprocal `depends_on`/`unblocks` edges; `review` permits one bounded `ready_when` check; omitted or `manual` requires new human/external proof.
- Only backlog or blocked auto/review packets with exact `blocker_type: dependency` are scanner-eligible. Empty/other blocker types fail closed; human/external blockers stay manual until new proof arrives.
- Root/orchestrator claims and reconciles one-shot completion callbacks; workers execute without periodic monitoring or heartbeats.
- Root assigns one stable `recovery_id` per ambiguous incident and persists a new immutable `worker_creation_attempt_id` before every actual create call, including an authorized replacement.
- When app-native task APIs are exposed, root verifies one candidate's exact title, `target_project_id`, `target_path` cwd, `worker_host_identity`, and handoff through live list/read tools. Only then does it write the candidate ID to canonical `worker_thread_id` and mark visibility `verified`.
- `execution_environment` records packet intent (`auto`, `worktree`, or `local`). Root resolves `auto` from the project default, then the portable fallback: Git implementation and independent QA use `worktree`; non-Git, host/runtime, and Workboard queue/control-plane work use `local`.
- Explicit or resolved `local` requires `execution_environment_reason`. Continuing a canonical task preserves its existing environment. Projectless routing and `dispatch_mode` are separate decisions.
- Before delegation, root persists `resolved_execution_environment`, then verifies saved-project binding, canonical task identity, project root, and Local/Worktree execution cwd through the app-native readback. A managed worktree cwd is valid and must not be rejected merely because it differs from `target_path`.
- Helper, separate app-server, session-index, or database persistence is not proof that the running Desktop UI refreshed.
- On app-native stall/timeout/ambiguous readback, preserve raw/replacement IDs as recovery evidence, set `worker_visibility_status: ambiguous`, `recovery_status: investigating`, and `recovery_pending: true`, create no duplicate, and keep this source packet in `tasks/claimed/` so its exact target lock and capacity slot remain active.
- Move this source packet to `tasks/blocked/` and release its lock only after recovery proves ambiguity resolved and no usable/canonical worker remains; record the exact next action.
- The initial create handoff supplies `worker_creation_attempt_id` but cannot supply the future task ID. At callback time, the worker reports its host-current ID as `worker_task_id`; routing occurs only when it equals current canonical `worker_thread_id` and its attempt equals current `worker_creation_attempt_id`. Noncanonical or delayed callbacks are recovery evidence only.
- If app-native task APIs are not exposed, set `worker_visibility_status: portable_only`, record the session identity in `worker_portable_session_id`, leave canonical `worker_thread_id` empty, and do not claim live Desktop visibility or canonical callback routing.
- Verified app-native root output includes canonical `worker_thread_id` as the raw ID and `worker_task_link` as exactly the clickable `::created-thread{threadId="<RAW_TASK_ID>"}` directive with the same ID. Reject `::codex-thread`, URLs, malformed/extended directives, extra text/IDs, and multiple directives. The same contract applies to canonical task-creation recovery responses.
- After the cycle outcome is final, root writes `[idle|claimed|qa|review|blocked|done] <useful project or task label>` to `root_closeout_title`, applies it app-natively, and records exact readback in `root_closeout_title_proof`. Final `[poll]` titles are invalid. Token/phrase-aware validation rejects leading `WB`, `Workboard`, `poll`/`polling`, `queue check`, and `manual Workboard`, plus generic-only closeout/check/status labels, while allowing those character sequences inside larger real names.
- Set `root_closeout_title_status: verified` only after exact app-native readback. On unavailable/failed/timeout/mismatch, keep the truthful status and put the exact tool/call, error or elapsed timeout, requested title, and observed title in `root_closeout_title_blocker`; never claim success.
- Standalone root closeout reads the current task UUID only from `process.env.CODEX_THREAD_ID`, passes the exact value as `--title-task-id`, and fails closed when it is missing, malformed, or mismatched. Never use task list/search or task history to discover the current root ID. Persistent-root heartbeats are exempt.
- A heartbeat delivered to an intentionally persistent root task may retain an unchanged useful state-first title only when the exception and exact app-native readback are recorded. It does not permit worker heartbeat polling or generic-title retention.
- Every verified builder, QA, and canonical recovery response reports the raw canonical task ID separately plus the exact same-ID `::created-thread` directive.
- Before QA replaces the canonical `worker_thread_id`, preserve the original builder identity in `builder_thread_id`; set `qa_thread_id` when QA becomes active and retain it with every completed verdict.
- Claimed and active-QA packets lock only an exact decoded `target_project_id` + `target_path` tuple. Unrelated targets may route up to capacity; `parallel_safe` does not override a target lock.
- On claim, set `target_lock_status: held`, copy the exact target tuple into `target_lock_project_id` and `target_lock_path`, and record `target_lock_acquired_at`. Ready, blocked, review, done, and archive packets cannot retain a held lock.
- Pin a full 40-character `target_commit` or another typed `immutable_target` before active work. QA copies the exact target type/value into `qa_immutable_target_type`/`qa_immutable_target`, uses a relative or `${WORKBOARD_ROOT}`-rooted durable `qa_artifacts_root`, sets `qa_artifacts_dir` to exactly `<qa_artifacts_root>/<packet-id>`, and preserves the exact prior pinned target in `qa_prior_head` plus exact `pass|fail|blocked` prior result for a bounded continuation.
- During ambiguous creation this packet stays in `tasks/claimed`, keeps its capacity/target lock, sets `worker_creation_status: ambiguous`, `worker_visibility_status: ambiguous`, and `recovery_pending: true`, and records its stable `recovery_id`.
- Canonical or ambiguous app-native creation uses exactly `worker_creation_surface: app-native task tools`; canonical reconciliation atomically writes `worker_thread_id`, the canonical `worker_creation_attempt_id`, `worker_creation_status: canonical`, task title/link/host identity, `worker_visibility_status: verified`, exact `method=app_native_list_read|receipt=<receipt>` visibility proof and timestamp, `worker_creation_proof`, and `recovery_pending: false` without moving the packet. Linear-backed implementation titles use `[TEAM-123] <short label>` and QA titles use `[qa][TEAM-123] <short label>`; validate the exact app-native readback with `scripts/check-workboard-thread-title.mjs`. Email, helper, app-server, unknown, and case-variant surface labels are invalid. Ambiguous creation instead requires investigating recovery, a routing blocker, no canonical identity, and no verified visibility proof.
- A callback can request routing only while `completion_callback_status: pending`, `worker_creation_status: canonical`, visibility is verified, recovery is not pending, and its packet/task/attempt identity plus role/QA/result/lane matrix all match. Duplicate source frontmatter keys fail closed before routing. Replayed, noncanonical, delayed, ambiguous, and mismatched callbacks are recovery evidence only.
- When `qa_required: true`, implementation completion routes to `tasks/qa/`, not directly to `tasks/review/`.
- Initialize applicable QA publication and worker-notification status fields to `pending` when routing into `tasks/qa/`.
- QA runs in a separate product-read-only task against `target_commit` or another immutable artifact and returns `PASS`, `FAIL`, or `BLOCKED`.
- For a linked PR with GitHub-hosted Codex review, apply `docs/github-codex-review-gate.md` before merge readiness. Independent QA and hosted review must bind to the same current head. Route valid findings to the builder, record evidence for invalid findings, and rerun both gates after every fixing commit.
- With `qa_publish_to_github: auto|required`, QA posts one idempotent concise verdict comment to every verified packet-linked PR/issue and records its URL; local-only artifacts and absolute local paths stay off GitHub.
- QA notifies `builder_thread_id` according to `qa_worker_notification_policy`. Notifications are informational and must forbid fixes until root requeues the packet.
- Publication status is separate from `qa_result`; a write/tool failure must not rewrite the product verdict.
- Builder/QA sends exactly one final callback with packet ID, result, current `worker_thread_id` as callback `worker_task_id`, unchanged `worker_creation_attempt_id`, immutable proof, and exact next lane.
- Root must run `scripts/check-workboard-callback.mjs` with the canonical handoff kind, packet `qa_required`, source `worker_creation_status`, and source `completion_callback_status`. Only exact callback status `pending` can return `ROUTABLE`; the callback must also be role-valid, have canonical source creation, and match packet ID, callback `worker_task_id`, and `worker_creation_attempt_id` before it authorizes one bounded reconciliation read and lane move.
- Noncanonical or delayed callbacks are `RECOVERY_EVIDENCE`: append them to the status log, but do not read the superseded task or move the packet.
- Callback unavailability/failure emits `ROOT_RECONCILIATION_REQUIRED` with the identical envelope, including `worker_creation_attempt_id`, and records `completion_callback_error`; root must not replace it with monitoring.
- Root appends every reconciled callback envelope and receipt/error to the status log before resetting `completion_callback_*` for a later builder or QA handoff.
- Set `callback_source_task_id` to the canonical builder or QA task that emitted the callback. When a callback is no longer pending, it must match `completion_callback_worker_task_id`; `callback_handoff_required: true` keeps the persistent root handoff mandatory.
- Commit-backed callbacks use exactly `type=commit|source=<target_commit|qa_prior_head>|sha=<lowercase-40-character-sha>`, and the SHA must equal the applicable packet field. A worker pinned only to another immutable target uses exactly `type=<artifact|url|path>|source=immutable_target|value=<exact-value>`; its QA verdict uses the same type and value with `source=qa_prior_head`. Unknown fields, extra delimiters, type/source mismatches, and unequal values fail closed.
- Store public write evidence in `publication_receipts` and QA-specific comment or notification evidence in `qa_publication_receipts`. GitHub comment receipts use exactly `type=<github_issue|github_pr>|destination=<lowercase-owner/repo>#<positive-id>|url=https://github.com/<same-owner>/<same-repo>/<issues|pull>/<same-id>#issuecomment-<positive-id>` and must match packet `repo` plus the corresponding numeric `github_issue` or `github_pr`. Wrong-kind, case-variant, suffixed, zero-ID, private-host, and cross-repository URLs are invalid. GitHub release and artifact receipts retain their compatible typed destinations. A `published` status without at least one valid receipt is invalid.
- If this packet declares required tools/capabilities, root must preflight availability and include tool instructions in the worker handoff.
- Worker must not create subworkers unless this packet explicitly authorizes a bounded read-only swarm.
- Resolve each role's routing packet override first, then project override, then the portable `gpt-5.6-sol` medium default.
- Before escalating any role to high reasoning, set its `*_model_routing_reason_category` to exactly `high_stakes`, `security_sensitive`, `repeatedly_blocked`, or `unusually_complex`. Put optional descriptive context in the separate `*_model_routing_reason_note` field.
- Use `gpt-5.6-luna` only at medium reasoning when the role's `*_luna_eligibility` is exactly `bounded_high_volume` and `*_independent_verification: true`; the independent verifier must inspect the result before completion.
- Keep all context task-local. No private memory dumps and no secrets.
- For production-derived starter upgrades, generalize operational details and follow `docs/upstream-synchronization.md`; customized clones retain the public source issue/release backlink without requiring a fork.

Append one complete block for every lane transition. Unknown, duplicate,
reordered, malformed, misplaced, or trailing partial log fields invalidate the
entire packet. Use canonical log states
`backlog`, `ready`, `active`, `qa`, `blocked`, `review`, `done`, and `archive`;
frontmatter and folders use `claimed` for the `active` state. Do not rewrite or
delete prior blocks.

## State transition log

```text
STATE: ready
FROM: created
SUMMARY: Packet accepted for routing.
PROOF: Intake validation receipt or issue URL.
BLOCKER: none
NEXT: Root may claim after queue and lock checks.
UPDATED_AT: YYYY-MM-DDTHH:MM:SSZ
```

## Verification notes

Verifier fills this in during review.
