# Workboard Core project instructions

## Purpose

Workboard Core is the portable, public-safe protocol and starter implementation
for Workboard adopters. It owns reusable queue, routing, execution, and proof
contracts; adopter-specific credentials, mappings, private state, and client
material must remain outside this repository.

## Start here

Read [the repository overview](README.md) and
[contribution rules](CONTRIBUTING.md). Follow the canonical role, packet,
execution-environment, state-authority, and root Git preflight sections before
changing protocol behavior.

## Hard invariants

- Keep the core adopter-neutral. Machine paths, account IDs, credentials,
  client names, and Donna-specific live state do not belong here.
- Preserve single-writer state transitions, canonical-task reuse, target locks,
  and fail-closed route resolution.
- Production-derived improvements must be generalized and proven here; do not
  copy private adopter state upstream.
- Executable protocol behavior is authoritative over prompt prose.

## Scope and authority

Issue-scoped source, test, and documentation edits are allowed on feature
branches. Stop before publishing packages, changing adopter installations,
merging, deploying, touching credentials, or mutating live Workboard queues
unless explicitly authorized.

## Verification

Run the focused repository tests for every changed protocol, the documented
queue and packet validation commands, `git diff --check`, and final review.
Use disposable fixtures and assert observable state transitions, outputs, and
failure modes.

## Maintaining this file

Keep this file between 150 and 500 words and useful to almost every session.
Point to canonical docs instead of copying them, rewrite or prune before
appending, move conditional operations to runbooks, and enforce guarantees in
tests or schemas.
