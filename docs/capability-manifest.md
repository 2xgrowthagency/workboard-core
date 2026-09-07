# Capability Manifest

`workboard-capabilities.json` is the portable, machine-readable inventory of
the protocol and operational capabilities present in this checkout. It lets a
customized clone compare inherited behavior without diffing private repository
content.

## Version Rules

- `manifest_schema_version` is an integer. Version `1` readers must reject a
  different schema version rather than guessing at its meaning.
- `protocol_version` and supported capability `version` values use SemVer.
  Backward-compatible additions increment the minor version, compatible fixes
  increment the patch version, and removals or incompatible contract changes
  increment the major version.
- A capability is either `supported` with a SemVer version and file plus test
  evidence, or `not_implemented` with a null version, no test claim, and a
  repository file that records the gap.
- Readers must ignore unknown capability IDs after validating the declared
  schema version. This permits newer clones to add portable extensions without
  making an older consumer misread known capabilities.

The JSON Schema at `schemas/workboard-capabilities.schema.json` supports generic
tooling. The dependency-free repository validator is normative for path,
regular-file, evidence, digest, and starter synchronization rules.
It rejects duplicate JSON keys at every object depth and validates every path
component from the canonical repository root. Empty, dot, dot-dot, symlinked,
non-directory intermediate, nonregular final, escaped, and noncanonical alias
components fail before evidence is read.

## Evidence And Drift

Every capability lists repository-relative contract or implementation files and
focused tests. Its `evidence_sha256` hashes each listed path and exact file
content in manifest order. A changed, missing, duplicated, escaped, symlinked,
or nonregular evidence file makes validation fail. No capability evidence can
therefore change without an explicit manifest refresh in the reviewed diff.

The starter's core inventory covers every merged ST-001 through ST-013
contract. In particular, `task_packet_schema` is supported only when the strict
v2 packet validator, schema guide, canonical template, and focused validator
tests are present. `upstream_synchronization` is supported only when the ST-013
validator, synchronization guide, and focused gate tests are present.

Validate without mutation:

```bash
node scripts/check-workboard-capabilities.mjs --repo <WORKBOARD_ROOT>
```

After deliberately changing capability evidence, refresh digests and inspect
the resulting manifest diff before validation:

```bash
node scripts/check-workboard-capabilities.mjs \
  --repo <WORKBOARD_ROOT> \
  --refresh-evidence
git diff -- workboard-capabilities.json
node scripts/check-workboard-capabilities.mjs --repo <WORKBOARD_ROOT>
```

Digest refresh proves synchronization, not correctness. Reviewers must still
confirm that each status, summary, version, and evidence list matches behavior.

## Starter Synchronization

`starter_sync` records exactly one portable source coordinate:

- set `release` and leave `commit` null when adopting a named starter release
  or upgrade record; or
- set `commit` to the full lowercase 40-character starter commit and leave
  `release` null when adopting an unreleased commit.

The public `source_reference` and repository-relative `adoption_record` make
the coordinate auditable without relying on a remote name, fork ancestry,
checkout path, or private repository identity.

## Clone Adoption

For pinned release onboarding and upgrades, follow the
[adopter readiness runbook](adopter-readiness.md). Its conformance check requires
the release's exact portable bytes and modes; locally reconciled capability
metadata alone does not establish release conformance.

The following procedure describes capability-only adoption for customized clones:

1. Apply the starter change and retain local customizations.
2. Copy or merge the manifest, schema, validator, tests, and release/adoption
   record.
3. Set `starter_sync` to the release or commit actually adopted and keep the
   originating public issue or release URL.
4. Reconcile every capability status and evidence list against the clone. Do
   not mark a capability supported merely because its documentation was copied.
5. Refresh evidence digests, inspect the diff, run the capability validator,
   then run the full test suite.

Existing clones have no runtime migration for ST-014. Their adoption change is
complete only when the manifest truthfully describes the clone and validates.

## Upgrade Compatibility

Schema version `1` and protocol version `1.0.0` are backward-compatible metadata
over the existing Workboard contracts. Operators and packets do not need to
change. Future releases must update the manifest whenever a listed evidence
file changes, and production-derived upgrades must pass the ST-013 upstream
synchronization gate with a refreshed valid manifest.
