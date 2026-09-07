# Workboard Orchestrator Protocol

Protocol version: `1.5.0`. Before routing, a clone or automation may validate
its machine-readable capability inventory with
`node scripts/check-workboard-capabilities.mjs --repo <WORKBOARD_PATH>`. Treat a
missing, rejected, or stale manifest as unknown capability state, not permission
to assume a feature exists. The schema, compatibility, starter synchronization,
clone adoption, and evidence-digest rules are defined in
`docs/capability-manifest.md`.

Use this document as the standing instruction for your local orchestrator, whether it runs in Codex Desktop, Claude Desktop, Claude Code, OpenClaw, or another agent.

## Scheduled control-cycle layering

Adopter conformance uses `workboard-adopter-release.json` and
`docs/adopter-readiness.md`. `scripts/workboard-adopter.mjs check` inspects a pinned
Core release; `plan` emits a patch and separate Workshop proposals without writes.
Missing prerequisites leave current code `PARTIAL_NOT_ACTIVE`; conformance never
authorizes activation. Private identities, mappings, queues and authority remain
adopter-owned.

Scheduled and manually triggered polling use
`skills/workboard-control-cycle/SKILL.md` as the portable entrypoint. Load
shared base instructions first, the adopter profile second, and host-specific
machine bindings last. Adopters may provide identities, tools, paths, routing,
and stricter local stops; they may not reorder or weaken single-writer,
capacity, lock, claim-readback, recovery, callback, independent-QA, or proof
invariants. Automation records retain cadence and runtime metadata and contain
only the canonical one-line invocation.

## Roles

- **Human/operator** decides priorities and approves external/destructive actions.
- **Intake agent** turns requests into task packets in `tasks/ready/`.
- **Root orchestrator** runs the loop: synchronize, classify, claim, delegate, reconcile callbacks, update, push.
- **Worker thread** does one bounded task in one target project/path.
- **QA companion** independently verifies QA-required work from raw evidence and returns `PASS`, `FAIL`, or `BLOCKED` without quietly fixing it.
- **Human/context-owner verifier** reviews the verified outcome and moves packets from `tasks/review/` to `tasks/done/` or back to `tasks/ready/`/`tasks/blocked`.

## Cloud workers and local receipts

The Workboard root remains the local control plane even when an implementation
or QA worker runs in Codex Cloud. A Cloud dispatch must start from a pushed
branch and a verified ready environment, then record the Cloud task ID, URL,
branch, target commit, last checked time, and a concise result in the packet.
The Cloud transcript remains a separate Codex surface; the Workboard packet and
local thread hold the durable receipt and control state.

`cloud_dispatch_status` is one of `not_requested`, `preflight`, `submitted`,
`running`, `completed`, `failed`, `blocked`, or `applied`. The dispatcher may
submit, inspect status, show a diff, or apply a selected Cloud diff, but only
the Workboard root writes packet transitions. Never put environment-variable or
secret values in the packet or Cloud prompt; record names and readiness only.

One person/agent can play multiple roles, but keep the responsibilities separate. The root orchestrator should not become a free-roaming implementation agent unless the packet explicitly says the work is a Workboard/control-plane task.

When a host, tool, callback, saved project, or Git failure interrupts this
protocol, classify it with `docs/known-issues-and-recovery.md` and apply only the
recorded bounded response. The guide supplements rather than overrides the
normative gates below.

When a production-derived improvement changes this protocol, follow
`docs/upstream-synchronization.md`. The same change must update the portable
skill, task template, automation examples, focused tests, and a compatibility
and migration record with a public starter issue/release adoption backlink.
Run `scripts/check-upstream-sync.mjs` against an explicit local base ref before
release. This contribution gate does not alter the runtime queue contracts.

## Folder states

- `tasks/backlog/` — valid packets not yet eligible for execution.
- `tasks/ready/` — execution-ready packets waiting to be claimed.
- `tasks/claimed/` — active work owned by an orchestrator/worker.
- `tasks/qa/` — implementation-complete work with independent QA pending or active.
- `tasks/blocked/` — waiting on access, decision, dependency, or safe stopping condition.
- `tasks/review/` — QA-passed or QA-not-required work awaiting final review.
- `tasks/done/` — verified complete.
- `tasks/archive/` — terminal packets removed from active lifecycle with an
  explicit archive reason and receipt.

State changes are file moves plus append-only packet transition logs. New and
migrated packets use `packet_schema_version: 2`; validate the destination lane,
known and unique schema fields, canonical packet/dependency IDs, full commit
SHAs, exact model/escalation routes, visibility/recovery coherence, packet-scoped
QA artifacts, callback result/lane pairs, typed HTTPS receipts, complete log
blocks, secrets, and user-specific absolute paths with
`scripts/check-task-packet.mjs` before every move. Commit/push
each meaningful transition so everyone sees the same board. The normalized
contract and explicit legacy migration path are in `docs/task-packet-schema.md`.

Canonical app-native visibility requires exact creation surface
`app-native task tools` and the
exact `method=app_native_list_read|receipt=<receipt>` proof plus its UTC
verification timestamp. Ambiguous creation keeps those verified fields empty
and remains tied to investigating recovery evidence.

## Root Git synchronization preflight

Before queue classification or broad reads, run:

```bash
node scripts/check-workboard-git-preflight.mjs --repo <WORKBOARD_PATH>
```

The preflight is root-owned and ordered deliberately:

1. Canonicalize the requested path, obtain `git rev-parse --show-toplevel`, canonicalize that result, and require exact equality before queue or checkout inspection. Symlink and `..` aliases are accepted only when they resolve to the same canonical root; nested directories are rejected with `REASON=repo_path_not_top_level`.
2. Discover the Git common directory without inspecting queue or checkout state.
3. Atomically create `<git-common-dir>/workboard-root-preflight.lock/` and write `owner.json` containing only version, random lock ID, host name, process ID, and start time; it contains no repository or private filesystem path.
4. Verify the checkout is on `main`, has no unresolved conflict, and is clean.
5. Fetch `main` from the intended remote with terminal prompting disabled.
6. Compare `HEAD` with the fetched commit.
7. Fast-forward with `git merge --ff-only` only when clean `main` is strictly behind.
8. Revalidate branch, conflicts, exact `HEAD` and `FETCH_HEAD`, and full tracked/untracked status immediately before success; repeat this gate immediately before a fast-forward.
9. Run every Git operation as an interruptible child process group and process pending interruption state after every child exit.
10. Emit `READY`, `UPDATED`, or `STOP` synchronously while still owning the lock, then remove the owned lock on normal and failure paths.
11. Continue only on `GIT_PREFLIGHT_STATUS=READY` or `GIT_PREFLIGHT_STATUS=UPDATED`.

Stop on `GIT_PREFLIGHT_STATUS=STOP`. Its `REASON` distinguishes dirty,
conflicted, non-main, ahead, diverged, fetch/auth/network failure, and failed
fast-forward states. Do not run the classifier after a stop. The preflight
defaults to remote `origin`; pass `--remote <name>` when the intended remote has
a different name. The synchronized branch is always `main`.

### Cooperative lock and recovery

Atomic directory creation makes one compliant root the owner. Another root that
finds the lock returns `GIT_PREFLIGHT_STATUS=STOP REASON=preflight_lock_held`
before branch/status/fetch inspection. Missing, malformed, oversized, symlinked,
or otherwise invalid lock metadata also stops. Lock output contains no repository
path or host-private path.

Locks have no automatic expiry. `LOCK_AGE_SECONDS` is diagnostic only and never
proves staleness. To recover an abandoned lock, the operator must first verify
that the recorded PID is not an active preflight on the recorded host and that no
root on any other host sharing the Git common directory can still own it. Preserve
the `owner.json` evidence, remove only
`<git-common-dir>/workboard-root-preflight.lock/`, and rerun the preflight. Never
remove or replace a lock merely because it is old, and never recover it while its
owner may still run.

The lock coordinates compliant root preflights only. It does not provide
compare-and-swap for the checkout and cannot stop an uncooperative external
process from changing a ref or file after the final observation but before output.
Single-root/single-writer discipline remains required. Final revalidation is
retained to detect changes that occur before that last observation.

### Interruption semantics

The first `SIGHUP`, `SIGINT`, or `SIGTERM` is latched. If Git is active, the
preflight terminates its process group, escalates to `SIGKILL` after a short
grace period when needed, drains pending signal delivery after child exit, and
checks the latched state again before any success emission. An interrupted run
must emit `GIT_PREFLIGHT_STATUS=STOP REASON=INTERRUPTED SIGNAL=<signal>`, remove
only its owned cooperative lock, and exit nonzero. It must never emit `READY` or
`UPDATED`, even when the interrupted Git command later exits successfully.

## Queue-first classifier

Run the read-only classifier before reading `projects.yaml`, packet bodies,
blocked/backlog narratives, task history, or old automation memory:

```bash
node scripts/check-workboard-queue.mjs --repo <WORKBOARD_PATH> --capacity <MAX_ACTIVE_TASKS>
```

`--capacity` defaults to `8` when omitted. If the local automation uses another
limit, pass that configured value directly; do not read packet bodies or worker
history to compute it.

The classifier inspects only local queue metadata needed for counts, QA state,
and target locks. It never invokes Git, moves packets, or creates task
directories. Before classification it canonicalizes `--repo` and requires a
real `.git` directory or regular `.git` file at that exact root. This independent
identity guard accepts aliases resolving to the root and rejects nested paths;
it does not discover or judge Git state. Git synchronization and judgment belong
exclusively to the root preflight. Its default mode writes nothing. A scheduled
poll may opt into one strict memory record outside the repository:

```bash
node scripts/check-workboard-queue.mjs \
  --repo <WORKBOARD_PATH> \
  --capacity <MAX_ACTIVE_TASKS> \
  --run-memory <EXTERNAL_STATE_PATH>/poll.json \
  --idle-pause-threshold <NO_ACTION_RUNS> \
  --idle-pause-action <recommend|pause>
```

Do not combine `--run-memory` with the compatibility input
`--no-action-streak`. Persistent mode increments a stable no-action signature,
starts at one after a queue transition, and resets to zero for an actionable
lane. The signature hashes only status, counts, and locks; the one-line JSON
record stores no packet body, path, project registry, thread history, or prior
narrative. Memory must remain outside the repo and fails closed when malformed,
multiline, oversized, symlinked, or incompatible.

Use the result to open the smallest required lane:

- `NOTHING_TO_CLAIM`: report the counts and stop.
- `WORK_IN_PROGRESS`: report the lock/count/capacity snapshot and stop. This is returned when active work reaches capacity even if ready or pending-QA inventory exists. Do not open packet or worker history.
- `READY_WORK_AVAILABLE`: read the registry and only the ready packets needed for routing.
- `QA_WORK_AVAILABLE`: read the registry and only the pending QA packets needed for routing. Pending QA takes precedence when ready implementation work also exists; rerun the classifier after routing QA to expose the remaining ready lane.
- `QA_RESULT_AVAILABLE`: read only the emitted completed-QA packets, verify the recorded evidence, and route `PASS` to review, `FAIL` to ready, or `BLOCKED` to blocked. Do not launch another QA task.
- `PROMOTION_REVIEW_NEEDED`: follow `docs/dependency-promotion.md`; open only emitted review candidates, never the whole backlog or blocked lane.
- `WORKBOARD_REQUIRES_JUDGMENT`: stop for malformed packet metadata or unrecognized QA state/result.
- `CHECK_FAILED`: report the exact classifier failure and stop.

Every successful lane emits `NO_ACTION_STREAK`, `IDLE_PAUSE_RECOMMENDED`,
`IDLE_PAUSE_REQUESTED`, and `IDLE_PAUSE_ACTION`. Only stable
`NOTHING_TO_CLAIM` and claimed/active-QA-only `WORK_IN_PROGRESS` snapshots count
as no action. Ready, pending-QA, completed-QA, or promotion inventory resets the
streak and suppresses pause, including ready work waiting at full capacity.
`recommend` is advisory. For `pause`, the classifier requests the action but the
host controller must call its native automation pause operation and read back
the paused state. Never claim success from the request field alone.

## Optional Codex task finalizer

After the queue outcome is known and any required dependency promotion,
callback reconciliation, or delegation transition is complete, Codex operators
may run `scripts/classify-codex-task-finalizer.mjs`. Follow
[`codex-task-finalization.md`](codex-task-finalization.md): pass only explicit
local rollout files and exact configured automation ID/name pairs, honor the bounded
candidate limit, and treat every output as a read-only proposal.

Each output line must strictly parse through `parseFinalizerJsonLine` as schema
`codex-task-finalizer/v1`. Use only raw parsed `record.thread_id`,
`record.title`, and `record.action`; never split tokens, infer percent-decoding,
call `decodeURIComponent`, or apply serialized JSON/encoded text as a UI title.

The first user message must carry the exact configured automation name and ID.
Every later non-heartbeat user message is manual follow-up evidence, even when
it repeats the initial trigger byte-for-byte.

Mutate only strictly parsed `FINALIZER_CANDIDATE` task IDs through app-native task tools. Read
the exact raw task ID before mutation, apply the raw title, verify that exact raw title after rename, and verify the
archived state after any archive. Stop on missing/duplicate tasks, conflicts,
timeouts, stale readback, or manual follow-up. Preserve useful errors, blockers,
review/QA/delegation evidence, canonical worker proof, and idle-pause blockers.
Never edit or hard-delete SQLite rows. Finalization does not move packets,
release locks, pause automations, or substitute for live visibility proof.

This routine root work keeps the portable `gpt-5.6-sol` medium default. The
normal packet/project precedence and validated high/Luna exceptions remain
unchanged.

Claimed and active-QA lock values are metadata summaries in the form
`packet_id|target_project_id|target_path`. Each component is percent-encoded so
spaces and delimiter characters remain reversible. Decode each component before
exact target comparisons. Locks are routing inputs, not permission to open worker
history.

Before claiming any ready packet, compare its decoded `target_project_id` and
`target_path` tuple with every decoded claimed and active-QA lock. Both fields
must match exactly for the target to be locked. Reject a matching target even if
the packet ID differs. An unrelated target remains eligible while capacity is
available. The executable check is:

```bash
node scripts/check-workboard-target-lock.mjs \
  --target-project-id "$TARGET_PROJECT_ID" \
  --target-path "$TARGET_PATH" \
  --claimed-locks "$CLAIMED_LOCKS" \
  --qa-active-locks "$QA_ACTIVE_LOCKS"
```

Malformed or undecodable lock input fails closed. Every component is decoded
strictly; empty or whitespace-only decoded components, malformed UTF-8, and the
Unicode replacement character are rejected. Do not normalize case, resolve
symlinks, trim path segments, or use substring matching in the routing decision;
packets and locks must use the canonical registry values. The queue classifier
applies the same UTF-8/replacement-character checks to packet frontmatter.


## Tool and skill preflight

Task packets may declare required capabilities: `requires_browser`, `requires_computer_use`, `requires_google_drive`, `requires_google_docs`, `requires_screenshot`, and `required_skills`.

Before claiming/delegating a tool-required packet:

1. Confirm the intended worker surface can use the required tool/capability.
2. Read the relevant local skill/SOP when available.
3. Add the requirement to the worker handoff prompt.
4. Define the proof the worker must return, such as screenshot path, browser URL/status, Google Doc/Drive file ID, or explicit reason a safe substitute was used.
5. If the tool is unavailable, move the packet to `tasks/blocked/` with the missing capability and what the operator must do next.

Do not silently skip required tools. A packet with unmet builder proof cannot move to `tasks/qa/` or `tasks/review/`, and QA-required work cannot move to `tasks/review/` without an independent `PASS`.

## Model routing

Use `gpt-5.6-sol` with medium reasoning as the portable default for root
orchestration, implementation, documentation, tests, and routine QA. Resolve
each role independently in this order:

1. Explicit task-packet model and reasoning.
2. Explicit target-project model and reasoning.
3. Portable `gpt-5.6-sol` medium defaults.

Packet and project overrides are intentional routing inputs, not defaults to
rewrite. Template role fields stay blank so copied packets do not mask project
settings. Any route using high reasoning must set the role's task-local
`*_model_routing_reason_category` to exactly `high_stakes`,
`security_sensitive`, `repeatedly_blocked`, or `unusually_complex` before
dispatch. Optional descriptive prose belongs in the separate
`*_model_routing_reason_note`. Portable reasoning values are `low`, `medium`,
and `high`; malformed or unsupported values fail closed.

`gpt-5.6-luna` is allowed only at medium reasoning when the role's
`*_luna_eligibility` is exactly `bounded_high_volume` and the matching
`*_independent_verification` is `true`. Any other eligibility value or missing
verification rejects the route. Luna output is not its own verification.
No other model identifier is valid in a v2 packet. A reason note requires its
recognized high-reasoning escalation category, and Luna eligibility is invalid
for `gpt-5.6-sol`.

Validate any override, high escalation, or Luna route before dispatch:

```bash
node scripts/check-model-routing.mjs \
  --packet-model "$PACKET_MODEL" \
  --packet-reasoning "$PACKET_REASONING" \
  --packet-reason-category "$PACKET_MODEL_ROUTING_REASON_CATEGORY" \
  --packet-reason-note "$PACKET_MODEL_ROUTING_REASON_NOTE" \
  --project-model "$PROJECT_MODEL" \
  --project-reasoning "$PROJECT_REASONING" \
  --luna-eligibility "$LUNA_ELIGIBILITY" \
  --independent-verification "$INDEPENDENT_VERIFICATION"
```

`MODEL_ROUTING_STATUS=REJECTED` or `CHECK_FAILED` is a routing hard stop. Include
the resolved model, reasoning, source, reason category/note, Luna eligibility,
and verification requirement in the create handoff and recovery record. Unknown,
duplicate, missing-value, and misspelled CLI options return `CHECK_FAILED`. Do
not infer model policy from private memory or unrelated task history.

### Execution profile and cloud handoff

Every packet carries a task execution profile in addition to its per-role model
route. `execution_environment` is intent (`auto`, `cloud`, `worktree`, or
`local`); `resolved_execution_environment` is the persisted pre-claim result.
When a project declares Cloud as preferred, `auto` may resolve to Cloud only
after `cloud_environment_name` is known and `cloud_readiness` is `ready`.
Otherwise the portable fallback is Worktree for Git implementation/QA or Local
for host, GUI, and account-bound work. Explicit or resolved Local requires
`execution_environment_reason`.

Cloud metadata records setup contract, network policy, and names of required
environment variables and secrets. It must never contain values. Repository
bootstrap proof from the cloud-ready setup files is separate from hosted Codex
settings proof; a missing hosted environment is a routing blocker, not a
successful Cloud run.

### Linear-ready state authority

`task_state_authority: workboard` is the default. A Linear-authoritative task
uses `task_state_authority: linear` plus a `linear_issue_key`. The state update
policy remains `single_writer`: Workboard and Linear are not dual-write peers,
and a Linear task must not have a mirrored packet under `tasks/`.

Before recurring Linear claims, install and certify a concrete adapter against
`scripts/linear-single-writer.mjs` and follow
`docs/linear-single-writer.md`. Bind the operator and executor to one stable
Linear member ID through clone configuration; mutable display text is not
identity proof. Count verified running implementation, verified running
independent QA, and recovery-retained incidents against one capacity ceiling.
Order eligible Ready issues independently of adapter return order: Urgent,
High, Medium, Low, then No priority; within one priority, oldest created first.
Claim the first unlocked eligible issue and continue downward past ineligible
or target-locked issues. Configure the shared Ready view to show the same order.
Manual drag position is not authoritative because the approved Linear tool
binding does not expose it; priority changes are the scheduling control.
Human or owner review consumes no worker slot and owns no target lock. Require
the adapter to classify every active readback as `implementation_running`,
`qa_running`, or `human_review`; missing or contradictory classification fails
closed. Retain capacity and exact project/path locks while recovery is open,
and reject callbacks until recovery resolves.

The composed cycle must serialize admission, record an incident before worker
preparation, reread eligibility, capacity, and locks before claim, read back
every Linear mutation and canonical worker start, and require a separately
created and read-back verifier task with a bound PASS receipt before Done. A
manifest, protocol, planner, or test double is not a live adapter. Keep
`linear_single_writer` `not_implemented` and recurring claims disabled until the
authenticated adapter and full canary sequence are proven.

## Polling loop

1. `cd` into the Workboard repo.
2. Run `node scripts/check-workboard-git-preflight.mjs --repo <WORKBOARD_PATH>` and stop unless it returns `READY` or `UPDATED`.
3. Run `node scripts/check-workboard-queue.mjs --repo <WORKBOARD_PATH> --capacity <MAX_ACTIVE_TASKS>`; a scheduled poll may add the external memory, threshold, and pause-action flags above.
4. Stop immediately on preflight, judgment, or classifier failure statuses.
5. Read `projects.yaml` if the returned lane requires routing; otherwise avoid broad context. On an idle/claimed-only lane, use only the classifier line and strict run-memory record, never old automation narratives.
6. Treat claimed and active-QA packets only as capacity usage and per-target locks. Never inspect, monitor, heartbeat, or babysit their task history during an ordinary poll.
7. Trust the classifier's `CAPACITY`, `AVAILABLE_CAPACITY`, and `CAPACITY_REACHED` fields. `WORK_IN_PROGRESS` machine-enforces a stop when available capacity is zero.
8. If the classifier returns a routable lane and capacity remains, inspect `tasks/ready/` by priority and age even when another target is active.
9. Decode the emitted locks and reject every ready packet whose exact `target_project_id` and `target_path` tuple is locked. `parallel_safe` does not override a target lock.
10. Claim only independent eligible packets for unlocked targets, up to remaining capacity.
11. Resume a canonical task first and preserve its execution environment. Otherwise resolve packet `execution_environment`, then project `default_execution_environment`, then the portable fallback: Git implementation and independent QA use Worktree; non-Git, host/runtime, and Workboard root/queue work use Local. Explicit or resolved Local requires `execution_environment_reason`.
12. Move selected packets to `tasks/claimed/`, fill `claimed_by` and `claimed_at`, persist `resolved_execution_environment`, pin `target_commit` or another immutable target, set the exact target lock fields, append `STATE: active`, validate the packet, then commit/push before delegating.
13. Persist a new `worker_creation_attempt_id` before every actual create call, then delegate through the live task visibility gate below. Create at most one worker for that attempt, preserve partial IDs/results as recovery evidence, and write canonical identity only after complete app-native proof. Keep one stable `recovery_id` for an ambiguous incident; an authorized replacement receives a new attempt ID. Preserve the original canonical builder as `builder_thread_id` before creating QA.
14. Resolve and validate the role's model/reasoning route, then give the worker the full task packet plus the exact worker handoff prompt below.
15. Do not monitor the worker. Reconcile its one final callback only when verified visibility is current, recovery is not pending, and its packet, worker task, creation attempt, role, QA requirement, result, lane, and exact structured immutable proof all match the source packet's applicable pinned target. Commit targets use `type=commit|source=<target_commit|qa_prior_head>|sha=<lowercase-40-character-sha>`; artifact, URL, or path targets use `type=<artifact|url|path>|source=<immutable_target|qa_prior_head>|value=<exact-value>`.
16. Inspect `tasks/qa/`. For each pending packet, verify its relative or `${WORKBOARD_ROOT}` artifact root, exact `<root>/<packet-id>` directory, copied immutable target type/value, and full-SHA prior head plus exact prior result for continuations; record `qa_thread_id` when QA becomes active, then launch one separate `[qa][<linear_issue_key>] <short label>` task inside the existing target project. Git QA defaults to a fresh managed Worktree unless it resumes a canonical QA task or records a justified Local reason.
17. Before routing the verdict, publish a concise idempotent QA summary to verified packet-linked PRs/issues when policy enables it, notify the original worker according to policy, and record exact `type=<github_issue|github_pr>|destination=<lowercase-owner/repo>#<positive-id>|url=https://github.com/<same-owner>/<same-repo>/<issues|pull>/<same-id>#issuecomment-<positive-id>` `qa_publication_receipts` associated with packet `repo` and numeric issue/PR fields, or exact fallback status separately from the verdict.
18. Before leaving QA, copy the completed immutable target/result into `qa_prior_head`/`qa_prior_result` and retain durable artifacts. Route QA `PASS` to `tasks/review/`, `FAIL` to `tasks/ready/` with rework guidance, and `BLOCKED` to `tasks/blocked/` with the missing input/capability.
19. Move QA-not-required packets to `tasks/review/` when builder proof is ready.
20. Validate the callback with `scripts/check-workboard-callback.mjs`, including source `completion_callback_status`. Only exact source status `pending` can return `CALLBACK_STATUS=ROUTABLE` and authorize one bounded read of the canonical `worker_thread_id` and exact packet to reconcile immutable proof and requested next lane. It does not authorize later or periodic reads.
21. If `IDLE_PAUSE_REQUESTED=1`, call and verify the host-native pause operation. If only `IDLE_PAUSE_RECOMMENDED=1`, report the recommendation without claiming a pause.
22. On `PROMOTION_REVIEW_NEEDED`, run the metadata-only scanner workflow. Root may move `auto` candidates after dependency-state verification; `review` candidates permit one bounded `ready_when` check. Omitted/manual and non-dependency blockers require new human/external proof.
23. Commit/push every queue state transition and rerun classification after promotion.

## Dependency promotion

Workers stop after returning proof for their own packet. Root owns all downstream
promotion. Packet authors declare `promotion_policy`, `dependency_ready_state`,
`blocker_type`, `depends_on`, `unblocks`, and `ready_when`; the exact field
semantics and scanner output contract are in
[`docs/dependency-promotion.md`](dependency-promotion.md).

The scanner reads frontmatter only and considers backlog plus blocked packets
whose auto/review metadata has exact `blocker_type: dependency`. Empty or other
blocker types fail closed. `auto` requires the exact
`ready_when: dependencies_satisfied` sentinel and reciprocal
`depends_on`/`unblocks` edges, so all readiness is mechanically represented by
dependency states. Reachable dependency cycles fail explicitly before state
checks. `review` allows root to open that candidate and check one named artifact
or bounded condition. Manual, omitted, human, and external conditions are not
poll candidates. Invalid scanner metadata is a hard stop, not permission to
guess or promote.

## Completion callback contract

Every builder and QA create handoff must include the packet's persistent
`root_task_id`, packet ID, current `worker_creation_attempt_id`,
`target_project_id`, and `target_path`, but cannot include the future task ID.
The packet sets `callback_handoff_required: true`; after delivery, root records
the emitting canonical task in `callback_source_task_id`, which must equal the
callback worker task ID.
`root_task_id` is created once by the source root task and survives builder, QA,
rework, and review handoffs. `worker_thread_id` is always the current canonical
live-read task; `worker_creation_attempt_id` is minted once for that task-creation
attempt and copied unchanged into its handoff and callback.

Each builder or QA task sends exactly one final callback to `root_task_id` after
it has stopped mutating its target. The callback is a single envelope:

```text
WORKBOARD_COMPLETION_CALLBACK
packet_id: <packet-id>
result: <ready_for_qa|ready_for_review|pass|fail|blocked>
worker_task_id: <current-builder-or-qa-task-id>
worker_creation_attempt_id: <current-creation-attempt-id>
immutable_proof: <commit-sha-pr-url-artifact-digest-or-other-immutable-reference>
next_lane: <tasks/qa|tasks/review|tasks/ready|tasks/blocked>
```

The result and lane must agree: builders use `ready_for_qa -> tasks/qa`,
`ready_for_review -> tasks/review`, or `blocked -> tasks/blocked`; QA uses
`pass -> tasks/review`, `fail -> tasks/ready`, or `blocked -> tasks/blocked`.
The packet validator applies this same exact mapping to every retained callback
envelope and rejects unknown results or alternate lane spellings.
The callback requests routing; only the root moves the packet. Progress notices
are not callbacks, and a task must not send a second final callback to amend the
first one.

Before any lane move, run the callback validator with the current source packet
fields and callback envelope:

```bash
node scripts/check-workboard-callback.mjs \
  --source-packet-id "$PACKET_ID" \
  --source-handoff-kind "$SOURCE_HANDOFF_KIND" \
  --source-qa-required "$QA_REQUIRED" \
  --source-worker-thread-id "$WORKER_THREAD_ID" \
  --source-worker-creation-attempt-id "$WORKER_CREATION_ATTEMPT_ID" \
  --source-worker-creation-status "$WORKER_CREATION_STATUS" \
  --source-completion-callback-status "$COMPLETION_CALLBACK_STATUS" \
  --source-worker-visibility-status "$WORKER_VISIBILITY_STATUS" \
  --source-recovery-pending "$RECOVERY_PENDING" \
  --callback-packet-id "$CALLBACK_PACKET_ID" \
  --callback-result "$CALLBACK_RESULT" \
  --callback-worker-task-id "$CALLBACK_WORKER_TASK_ID" \
  --callback-worker-creation-attempt-id "$CALLBACK_WORKER_CREATION_ATTEMPT_ID" \
  --callback-immutable-proof "$CALLBACK_IMMUTABLE_PROOF" \
  --callback-next-lane "$CALLBACK_NEXT_LANE"
```

Structurally parse the source frontmatter and reject duplicate keys before
passing its fields to the validator. Set `source-handoff-kind` from the
canonical handoff (`builder` or `qa`), `source-qa-required` from the source
packet, and `source-worker-creation-status` from `worker_creation_status`.
Set `source-completion-callback-status` from the source packet's
`completion_callback_status`; only exact `pending` is routable. Any supplied
non-pending value is recovery evidence, while a missing or blank value is a
check failure.
Builders may return
`ready_for_qa` only when QA is required, `ready_for_review` only when it is not,
or `blocked`; QA may return only `pass`, `fail`, or `blocked`. Only
`CALLBACK_STATUS=ROUTABLE` may move the packet. A packet-ID, task-ID, or
attempt-ID mismatch returns `CALLBACK_STATUS=RECOVERY_EVIDENCE`. This includes
late callbacks from superseded creation attempts: retain the envelope in the
status log, but do not move the packet or treat it as live-read authorization.
Malformed envelopes return `CALLBACK_STATUS=CHECK_FAILED` and also cannot route.

If the callback capability is unavailable or the send fails, emit this marker
in the task's final output and any packet-local status surface already
authorized by the handoff:

```text
ROOT_RECONCILIATION_REQUIRED
packet_id: <packet-id>
result: <same-result>
worker_task_id: <same-task-id>
worker_creation_attempt_id: <same-attempt-id>
immutable_proof: <same-proof>
next_lane: <same-next-lane>
```

Record the callback error separately. Never replace callback failure with
polling, heartbeat checks, repeated task reads, or a second worker. An operator
or explicit recovery event can deliver this marker to the persistent root task,
which then permits the same one bounded reconciliation read.

After the bounded reconciliation, append the complete callback envelope and
delivery receipt or error to the packet transition proof, update
`callback_source_task_id`, and retain publication receipts. Reset the current
`completion_callback_*` fields to `pending` only when creating a later builder
or QA handoff, so every prior callback remains durable and auditable.
## Ambiguous task-creation recovery

A timeout or stalled app-native creation call is not proof of failure. Persistence
may have completed after the caller stopped waiting. During recovery, the source
packet stays in `tasks/claimed`, continues to consume capacity, and retains its
exact `target_project_id` + `target_path` lock. Ordinary polls must not retry it,
move it to blocked, or route another worker to the same target.

1. Before the first create call, assign one `worker_creation_attempt_id`. On ambiguity, assign one stable incident `recovery_id`, set recovery-record `recovery_outcome: investigating`, set source `worker_creation_status: ambiguous`, `worker_visibility_status: ambiguous`, and `recovery_pending: true`, and commit those fields without moving the packet.
2. Copy `templates/task-creation-recovery.md` beside the source packet or into the configured recovery-record location. Snapshot the source packet's exact `id -> source_packet_id`, `root_task_id`, original `worker_creation_attempt_id`, `target_project_id`, `target_path`, and `worker_creation_surface`; do not introduce alternate project/cwd/ownership fields.
3. Preserve the requested title, raw task ID (`unknown` is valid when none returned), selected model/reasoning, creation/recovery timestamps, every exact failed or stalled call, and all partial returned evidence.
4. On the same live app-native surface, list tasks narrowly enough to find candidates, then read every plausible task by raw ID. Match title, target project/path, source handoff, and usability. A helper-process result or creation response without live readback is not sufficient.
5. Do not create a replacement while the original outcome remains unknown. `replacement_authorized: true` is invalid while investigating. Authorize exactly one replacement call only after structured app-native list/read receipts conclusively prove the original absent or unusable, and record one explicit pre-call authorization. Before that call, mint a new unique `replacement_worker_creation_attempt_id`; preserve its returned ID as attempt evidence only.
6. Read back the surviving original or authorized replacement and record exactly one raw `canonical_task_id`, exact same-ID `canonical_task_link: ::created-thread{threadId="<CANONICAL_TASK_ID>"}`, its `canonical_worker_creation_attempt_id`, matching canonical read task ID, `CANONICAL_USABILITY: usable`, and `recovery_outcome: canonical_worker`. Print the same raw ID and directive in the canonical recovery response. `::codex-thread`, URLs, malformed/extended directives, extra text/IDs, and multiple directives are unsupported. An authorized replacement becomes canonical only after complete readback. If conclusive app-native list/read instead proves no usable worker remains, set `recovery_outcome: no_usable_worker`, leave canonical fields empty, and complete the structured `No-canonical resolution` evidence with an exact next action.
7. Record either `DUPLICATE_STATE: none_found` with search receipt or one verified archive/stand-down JSON receipt per duplicate. Destructive disposal is forbidden and useful history remains preserved.
8. Validate the recovery record with `node scripts/check-task-creation-recovery.mjs <RECOVERY_PACKET>`. For `canonical_worker`, atomically write canonical task/attempt identity, canonical/verified statuses, visibility proof/timestamp, and `recovery_pending: false` back to the still-claimed source packet with `node scripts/reconcile-task-creation-recovery.mjs canonicalize --repo <WORKBOARD_PATH> --source-packet <WORKBOARD_PATH/tasks/claimed/PACKET> --recovery-packet <RECOVERY_PACKET>`. All three path arguments must be absolute and lexically canonical: no dot, dot-dot, redundant-component, or trailing-separator aliases. The canonicalizer rejects a repo root supplied through a symlink entry, symlinked `tasks` or `tasks/claimed`, duplicate frontmatter keys, non-regular or symlinked source packets, resolved escapes, and `no_usable_worker`. It compares source identity and exact content immediately before rename and rejects changes observed since its initial read. The fsynced same-directory temporary file plus atomic rename provides atomic replacement visibility and prevents partial packet contents. Ordinary POSIX/Node filesystems do not provide digest-conditioned compare-and-swap, so an uncooperative writer changing the source after that final comparison but before rename may be overwritten. Workboard's one-root/single-writer transition discipline is required to close that operational gap; a stronger multi-writer guarantee requires cooperative locking or transactional storage outside this protocol. After a completed `no_usable_worker` outcome validates, move the source to `tasks/blocked/` with its exact next action and release the lock.
9. Rerun dependency promotion with the configured policy/scanner, then rerun `node scripts/check-workboard-queue.mjs --repo <WORKBOARD_PATH>`. Record successful structured receipts, set the completion timestamps/status, and validate the completed record again.

Every worker callback carries `worker_task_id` and
`worker_creation_attempt_id`. Before routing, check both against the current
source packet:

```bash
node scripts/reconcile-task-creation-recovery.mjs check-callback \
  --source-packet <PACKET> \
  --worker-task-id <CALLBACK_TASK_ID> \
  --worker-creation-attempt-id <CALLBACK_ATTEMPT_ID>
```

The recovery reconciler reads `completion_callback_status` directly from the
structurally parsed source packet; callers must not substitute callback-local
state for that authoritative gate.

Only `CALLBACK_ROUTE_STATUS=ROUTABLE` can request a queue transition, and only
while the source has `completion_callback_status: pending`, verified visibility,
and no recovery pending. A replayed callback or one from a noncanonical task or
mismatched creation attempt is durable
recovery evidence only; append it to recovery proof and do not route. Move the source
packet to `tasks/blocked` and release its target lock only after app-native
reconciliation has resolved the ambiguity and proved no usable canonical worker
remains. A tool outage or inconclusive readback keeps the packet claimed and
locked.

If list/read is unavailable or inconclusive, leave the recovery packet
`investigating`, keep the lock, and report the exact blocker. Retrying creation is
forbidden until the packet satisfies the replacement gate.

## Concurrency policy

- One root orchestrator loop at a time.
- Up to 8 active workers by default.
- Prefer parallelism across different repos/projects.
- One worker per packet.
- One separate QA task per QA packet; the builder does not self-verify.
- QA keeps the product target read-only and reports failures instead of fixing them; packet-authorized result comments and task notices are the only closeout-write exception.
- Workers do not spawn workers by default.
- A packet may allow a bounded read-only swarm for research/QA discovery, but it must state limits, merge format, and stop conditions.
- Never use parallelism to bypass a blocker or approval.

## Routing rules

Read `projects.yaml` before routing. If the target project/path is missing or unclear, block and ask. Do not guess.

Resume the canonical task before creating anything and preserve its Local or
Worktree environment. Otherwise resolve packet intent, project default, then the
portable fallback. Git implementation and independent QA default to Worktree;
non-Git, host/runtime, and Workboard root/queue work default to Local. Explicit
or resolved Local requires `execution_environment_reason`.

For Codex Desktop or Claude Desktop projects, create the worker inside the saved project/workspace that maps to the packet target path and in the resolved environment. Do not manually reparent old threads into projects; start one new correctly-routed canonical task instead.

For Claude Code or Codex CLI, start the worker from an explicitly prepared
checkout matching the resolved environment and include the full packet in the
prompt. A fallback launcher that cannot create and prove a managed Worktree must
reject Worktree instead of silently using Local.

Projectless routing and `dispatch_mode` are separate decisions. Worktrees
isolate file state only; retain external-resource locks for Ads, Shopify Admin,
DNS, deployments, shared databases, browser sessions, and similar surfaces.

## Live task visibility gate

Follow [`docs/live-task-visibility.md`](live-task-visibility.md) for every
delegation. When the host exposes app-native project selection and task
create/list/read tools, use them and require live readback of one candidate's
task ID, exact `worker_task_title`, saved-project binding, target project root,
resolved Local/Worktree mode, execution cwd kind, host/local identity, and
worker handoff. A managed worktree cwd normally differs from `target_path`; it
is valid only when app-native proof binds it to the target project. Only then write that ID to canonical
`worker_thread_id` and set `worker_visibility_status: verified`.

A helper, separate app server, session index, or database proves persistence at
most; it does not prove the running Desktop UI refreshed. If an app-native call
stalls, times out, or returns an ambiguous partial result, keep the source packet
in `tasks/claimed/`, preserve its exact target lock and capacity slot, set
`worker_visibility_status: ambiguous`, `recovery_status: investigating`, and
`recovery_pending: true`, and create no duplicate. Raw or replacement IDs remain
recovery evidence until canonical writeback.

Move the packet to `tasks/blocked/` and release its lock only after recovery
proves the ambiguity resolved and no usable/canonical worker remains. Record the
exact next action. A noncanonical or delayed callback cannot route the packet;
its `worker_task_id` must equal current `worker_thread_id`, and its
`worker_creation_attempt_id` must equal current `worker_creation_attempt_id`.

When the host genuinely has no app-native task APIs, use the documented
`portable_only` fallback from the exact target path. Record its session evidence
without claiming live Desktop visibility.

Root output for a verified app-native delegation must include canonical
`worker_thread_id` as a raw ID and exactly the clickable
`::created-thread{threadId="<RAW_TASK_ID>"}` directive with the same ID. This applies to
every builder, QA, and canonical task-creation recovery response. Reject
`::codex-thread`, URLs, malformed/extended directives, extra text/IDs, and
multiple directives.

## State-first root closeout

Wait until the cycle's final outcome is known before changing the root task
title. Choose `[idle|claimed|qa|review|blocked|done] <useful project or task
label>`; `[poll]`, `WB`, a `Workboard` prefix, or a generic `Workboard` label is
not a valid final title. Apply the exact title through the running host's
app-native mutation tool, then read the task back and compare the title exactly.
Label validation is token/phrase-aware: reject leading `WB`, `Workboard`,
`poll`/`polling`, `queue check`, and `manual Workboard`, and labels made only of
generic closeout/check/status words, while allowing those character sequences inside
a larger real project/task name.

Do not treat a mutation return, local/session metadata, or a best-effort call as
verification. If the title tool is absent, returns an error, times out, or the
readback differs, report the exact tool/call, status or elapsed timeout/error,
requested title, and observed title when available. State explicitly that the
title is unavailable or unverified; do not claim the rename happened.

For standalone closeout, source the current root task ID only from
`process.env.CODEX_THREAD_ID` and pass that exact UUID as `--title-task-id` to
the closeout checker. Missing, malformed, or mismatched values fail closed.
Do not use task list/search or history to discover the current root ID;
only direct readback by the already-known environment ID is allowed for title
verification. An intentionally persistent root heartbeat is exempt from the
standalone environment-ID requirement.

One exception exists for a heartbeat delivered to an intentionally persistent
root task: when its state and useful label have not changed, retain the stable
state-first title, record the exception, and verify that retained title with
app-native readback. This does not permit ordinary worker monitoring or
heartbeat polling, and it does not preserve generic titles.

Validate assembled closeout evidence with
`node scripts/check-workboard-closeout.mjs`. A successful delegation includes
the separately printed raw task ID, the exact same-ID `::created-thread`
directive, and verified app-native
task readback. Unavailable or unverified
title proof supplies structured `--title-call` and `--title-failure` values and
a blocker record containing the requested title, call, failure, and mismatch
readback when applicable.

## Worker handoff prompt

```text
You are a Workboard worker. Work on exactly one packet.

Handoff identity:
- root_task_id: <persistent-source-root-task-id>
- packet_id: <source-packet-id-field-id>
- worker_creation_attempt_id: <source-worker_creation_attempt_id>
- worker_task_title: <exact-linear-key-first-title-or-qa-linear-key-title>
- target_project_id: <source-target_project_id>
- target_path: <source-target_path>
- worker_creation_surface: <source-worker_creation_surface>
- worker_host_identity: <host-local-identity>
- model: <resolved-model>
- reasoning: <resolved-reasoning>
- model_routing_reason_category: <allowed-category-or-none>
- model_routing_reason_note: <descriptive-note-or-none>
- luna_eligibility: <bounded_high_volume-or-none>
- independent_verification: <true-or-false>

Rules:
- Work only inside the task target_path, except you may append proof/status to the Workboard packet.
- Do not read or print secrets, .env files, credentials, private keys, cookies, or auth tokens.
- Do not deploy, publish, merge, change billing/account settings, touch production data, or perform destructive actions unless the packet explicitly allows it and the human has approved it.
- Do not create subworkers unless the packet explicitly authorizes a bounded read-only swarm.
- Keep context task-local. Do not import private memory or unrelated chat history.
- Stop and ask if acceptance criteria are ambiguous or verification is impossible.
- Send exactly one final callback to the supplied root_task_id. At callback time, report this task's host-current ID as `worker_task_id` with the exact `worker_creation_attempt_id`. Root routes only if complete live readback already wrote that task ID and attempt ID as the source packet's current canonical pair. A superseded task or attempt reports to recovery and must not request packet routing. If callback delivery is unavailable or fails, emit `ROOT_RECONCILIATION_REQUIRED` with the identical packet ID, result, host-current task ID, creation attempt ID, immutable proof, and next lane. Do not request periodic monitoring.

Required proof:
- Current working directory.
- Git remote/branch/HEAD/status if this is a git repo.
- Files changed or inspected.
- Commands/tests run and results.
- Screenshots/browser proof if UI-facing and safe to capture.
- Diff/PR/commit link if code changed.
- Caveats/blockers.
- Final callback result: `ready_for_qa` when independent QA is required, `ready_for_review` when it is not required, or `blocked`.
- Completion callback delivery receipt, or the explicit reconciliation marker and callback error.
- Echo the handoff identity above exactly so root can compare live readback.
```

The initial create handoff cannot contain `worker_task_id` because the host has
not allocated that ID yet. At callback time, the worker reads or reports its
host-current task ID as `worker_task_id`; the callback envelope writes it to
`completion_callback_worker_task_id` in the packet. Its attempt ID writes to
`completion_callback_worker_creation_attempt_id`. Root compares both values to
canonical `worker_thread_id` and current `worker_creation_attempt_id` before any
route. Portable workers leave `worker_thread_id` empty and return completion as
root reconciliation evidence rather than a routable canonical callback.

## QA handoff prompt

```text
You are an independent Workboard QA companion. Verify exactly one packet.

Handoff identity:
- root_task_id: <same-persistent-source-root-task-id>
- packet_id: <packet-id>
- worker_creation_attempt_id: <current-QA-creation-attempt-id>
- target_project_id: <canonical-target-project-id>
- target_path: <canonical-target-path>
- model: <resolved-qa-model>
- reasoning: <resolved-qa-reasoning>
- model_routing_reason_category: <allowed-category-or-none>
- model_routing_reason_note: <descriptive-note-or-none>
- luna_eligibility: <bounded_high_volume-or-none>
- independent_verification: <true-or-false>

Rules:
- Treat the builder's summary as a claim, not evidence.
- Verify the pinned commit or immutable artifact named by the packet.
- Keep the product target read-only. Do not fix code, merge, deploy, publish product/release changes, or mutate production data. Packet-authorized QA result comments and informational task notices are the only closeout-write exception.
- When `qa_publish_to_github` is `auto` or `required`, add or update one idempotent marker-bearing verdict comment on verified packet-linked PR/issue targets without uploading local-only evidence or exposing absolute local paths.
- When the linked pull request has a GitHub-hosted Codex review for the exact
  pinned head, inspect its findings as additional evidence and classify them;
  do not fix code or treat a missing/pending hosted run as a product verdict.
  Root owns the separate merge gate.
- Apply `qa_worker_notification_policy` to `builder_thread_id`. The notice is informational and must forbid fixes until root requeues the packet.
- Keep publication status separate from `qa_result`; publication failure records an exact fallback reason without changing the product verdict.
- Use the packet's required tools, interactions, viewports, and artifact directory.
- Record unsupported checks explicitly rather than weakening the acceptance criteria.
- Keep screenshots and reports local unless the packet explicitly allows sharing.
- Publish only to verified packet-linked GitHub targets. Use a stable marker to update/skip duplicate comments; never upload local-only artifacts or expose absolute local paths.
- Notify the original worker only according to packet policy; the notice must forbid fixes until root requeues the packet.
- Send exactly one final callback to the supplied root_task_id. At callback time, report this task's host-current ID as `worker_task_id` and include the unchanged `worker_creation_attempt_id`. Root routes only after live readback has made that pair canonical. If callback delivery is unavailable or fails, emit `ROOT_RECONCILIATION_REQUIRED` with the identical packet ID, verdict, host-current task ID, creation attempt ID, immutable proof, and next lane. Do not request periodic monitoring.

Return exactly one verdict:
- PASS: every required criterion is independently supported.
- FAIL: at least one criterion is violated; include rework guidance.
- BLOCKED: a required input, capability, authorization, or safe test surface is missing.

Required proof:
- Target commit/artifact identity.
- Checks performed and criterion-level results.
- Test, browser, console, network, screenshot, or file evidence as applicable.
- Absolute local artifact paths.
- Final repository status proving QA did not edit the target.
- GitHub comment URL(s), worker-notification status, or exact publication fallback reason.
- Completion callback delivery receipt, or the explicit reconciliation marker and callback error.
```

## GitHub-hosted Codex review gate

For repositories that run Codex review from GitHub, follow
`docs/github-codex-review-gate.md` before merge or final review completion.
Independent QA and hosted review must both apply to the exact current PR head.

A pending, unreadable, wrong-head, or valid-unresolved hosted review blocks
merge when the repository or packet requires that review. Triage each finding
against the code and relevant tests. Route valid findings to the existing
builder lane; QA remains read-only. Record evidence when rejecting an invalid
finding.

Any builder fix creates a new immutable head and invalidates the previous QA
verdict and hosted-review clearance. Rerun both gates. GitHub mergeability, a
local autoreview, or an older-head review is not sufficient merge proof.

## Completion standard

“Done” means independently verified and contextually approved, not merely attempted. QA should inspect raw artifacts directly: git status, diff, tests, build, screenshots, PR state, deployed URL, or direct file review as appropriate. Final review decides whether that verified result solves the actual task.
