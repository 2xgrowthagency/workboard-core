# Adopter onboarding and upgrades

Use a pinned Core commit to prepare a reviewable adoption patch. Code conformance
and runtime activation are separate decisions. These commands never access an
account, change a queue, apply a patch, push, or enable a scheduler.

## Contract and ownership

`workboard-adopter-release.json` schema 1 declares release/protocol versions,
compatibility, migrations, portable paths, Git file modes and SHA-256 hashes. The normative
parser is `scripts/workboard-adopter.mjs`: unknown fields, duplicate keys,
unsupported versions, omitted inventory entries, unsafe paths, symlinks and hash
mismatches fail closed. Operators verify public Core origin and select its full
commit SHA; hashes prove bytes, not author identity.

Core owns listed scripts, schemas, templates, tests and documentation. Adopters
retain `AGENTS.md`, `projects.yaml`, private adapters, stable member IDs, labels,
credentials, machine paths, worker history, queues and scheduler state. Unlisted
files are not read. Existing edits to listed files must match an explicitly
pinned previous Core version or stop for review. Removed surfaces require a
separate migration; automatic conflict resolution is forbidden.

Skills use `delivery: workshop`: proposals list required hashes and modes but patches
exclude them. Use the authorized Skill Workshop proposal/apply workflow for
source packages and retain its receipt; never hand-edit installed copies.
Conformance remains stale until these required bytes and executable modes match.

## Operator prerequisites

Agents can inspect portable files, prepare patches/proof and run disposable tests
autonomously. Operators own repository creation/visibility, account login,
membership, invitations, credentials, policy and activation. Record these exact
readbacks privately, using role placeholders in shared evidence:

- Accountable operator and approved repository owner/visibility; authenticated
  GitHub actor must match. A remote URL does not prove authentication.
- Linear account/team/stable member ID, operator/executor labels and immutable
  admission tuple must match the approved executor. Conflicting identity or
  Workboard/Linear dual-write authority blocks adoption.
- Saved Codex project ID, host and canonical path from live app-native list/read
  proof; a directory existing is insufficient.
- Private adapter certification against the portable single-writer engine;
  preserve deterministic ordering, locks, canonical task reuse, callback replay
  rejection and independent QA.
- Manual harmless claim and canonical callback canaries with state/lock readback,
  independent QA, immutable proof, and a tested rollback plan.
- Scheduler choice and exact disabled-state readback before initial activation.

Missing authentication, membership, project binding or canaries leaves current
code `PARTIAL_NOT_ACTIVE`. Stop for operator login/policy decisions; never invent
credentials, identity, membership or successful canaries.

## Upgrade an existing adopter

Use a clean, approved feature-branch review worktree and one upgrade writer. Stop
before applying on the default branch, to a dirty tree, with a competing writer,
or where authority/identity disagrees. Read-only inspection may inspect main.

```bash
node scripts/workboard-adopter.mjs check --repo <ADOPTER_REVIEW_ROOT> \
  --core <CORE_ROOT> --core-ref <FULL_CORE_COMMIT>
node scripts/workboard-adopter.mjs plan --repo <ADOPTER_REVIEW_ROOT> \
  --core <CORE_ROOT> --core-ref <FULL_CORE_COMMIT> \
  --previous-core-ref <PREVIOUS_CORE_COMMIT> > <PLAN_JSON>
node scripts/workboard-adopter.mjs plan --repo <ADOPTER_REVIEW_ROOT> \
  --core <CORE_ROOT> --core-ref <FULL_CORE_COMMIT> \
  --previous-core-ref <PREVIOUS_CORE_COMMIT> --format patch > <UPGRADE_PATCH>
```

Missing adopter manifest is `BLOCKED` in check mode. Plan permits first adoption:
absent files not present in the pinned baseline may be proposed; locally removed
baseline files block the complete patch; existing files must match either the desired
release or the pinned previous Core commit. Historical commits before this
manifest can establish ancestry. Never promote unknown adopter bytes to a trusted
baseline. Blocked JSON names exact paths and emits no patch.

Review blockers, paths, Workshop proposals and patch. In the approved feature
worktree run `git apply --check <UPGRADE_PATCH>`, then the authorized writer applies
that exact patch with `git apply`, obtains Workshop receipts and inspects
`git diff`. Rerun conformance. Repeated plans against matching bytes have no
changes and an empty patch. The planner has no apply, push, PR or scheduler API.

The approved writer commits and opens/updates one draft upgrade PR against the
adopter's actual default branch. Before merge require adopter tests, Core tests,
capability validation, disposable queue/packet checks, secret scan, independent
review and a migration receipt. Record Core SHA, manifest digest, previous Core
SHA, exact adopter PR head, paths, commands/results, Workshop receipts, preserved
ownership, rollback and missing prerequisites. No direct main push or auto-merge.

## Create a new adopter

Obtain operator decisions for repository ownership/visibility and roles first.
Until authorized, use only a disposable local Git fixture; create no live
repositories, accounts, memberships, invitations or schedules. Plan against the
empty fixture without a previous ref, review/apply on a feature branch and route
skills through Workshop. Add private policy/project mapping from role inputs
only; never copy another adopter. Read `docs/new-workboard-initialization.md`
for scaffolding/task lanes. Complete the private readbacks above. Missing
accounts are an expected partial state. Tests exercise two independent new
adopters with separate private inputs.

## Status and activation

Status precedence: `BLOCKED` for invalid/missing manifest, conflicting identity
or authority, unsafe scheduler or inputs; `UPGRADE_REQUIRED` for stale files
including skills; `PARTIAL_NOT_ACTIVE` for matching code without runtime proof;
`CURRENT` for matching code and all declared readbacks verified. Check exits 0
only for current, 1 for stale/partial, 2 for blocked. Plan exits 0 for a valid
proposal, 2 when blocked. Patch format refuses blocked plans. JSON reports exact
paths, prerequisites, manifest digest and Core SHA.

Optional `--readiness <READINESS_JSON>` reads only an explicitly supplied
credential-free declaration. Use `templates/adopter-readiness.json`, bind
`core_commit` to the selected SHA and fill its enum fields from private evidence.
Unknown fields, versions, duplicate keys and stale bindings are rejected.
`CURRENT` means the supplied declaration reports readiness; the tool does not
authenticate or certify it. Keep actual readbacks privately and renew the
declaration on Core head changes.

Every JSON conformance or plan report has `activation_authorized: false`,
including current. Manifest and patch output carry no activation grant. Activation
requires separate operator approval, all readbacks, independent QA, canaries and
disabled-scheduler proof. Only the authorized controller enables the chosen
scheduler; then read back identity/cadence and one bounded cycle. Stop and
reconcile failures. Code adoption never silently enables recurring claims.

## Rollback and future releases

Retain adopter base and private configuration backup under local policy. Rollback
is a reviewed revert by the same writer, followed by conformance/canaries against
the previous Core SHA. Keep scheduling disabled during unresolved migration or
rollback; never restore another adopter's identity or queue.

Keep the fleet registry private: approved repository, operator, last Core SHA,
canonical upgrade PR and runtime proof reference. On a published Core release or
explicit operator check, verify its origin, resolve its SHA and compare every
registered adopter. Propose one bounded PR per repository, reusing that release's
existing PR. Store exact blocked receipts when access or decisions are missing.
Registry membership grants no account, queue or scheduler rights.

Core maintainers refresh capability evidence first, then generate the manifest
with `node scripts/workboard-adopter.mjs manifest --repo <CORE_ROOT>` (stdout).
Review inventory/hash changes, commit and verify the pinned release. The manifest
excludes itself to avoid recursive hashes; receipts bind its digest and commit.
