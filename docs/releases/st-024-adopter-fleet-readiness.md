---
schema_version: 1
upgrade_id: ST-024
source_reference: https://github.com/2xgrowthagency/workboard-core/issues/61
compatibility: backward-compatible
migration_impact: Adopt the pinned manifest through a reviewed patch and Workshop proposals; preserve private configuration and require operator canaries before activation.
downstream_adoption_reference: https://github.com/2xgrowthagency/workboard-core/issues/61
---

# ST-024: Adopter fleet readiness

Protocol 1.5.0 adds release inventory, read-only conformance, patch proposals and
an operator runbook. Packet, queue, callback, identity and single-writer runtime
semantics remain unchanged. No packet fields are added.

Pin the previous Core commit: local bytes must equal that baseline or the desired
release. Unknown edits and removed surfaces require reviewed migration. New
adopters use disposable fixtures and stay partial until prerequisites pass.
Skills use Workshop; the planner never edits installed copies. See the
[upgrade eligibility rules](../adopter-readiness.md#upgrade-an-existing-adopter)
for missing adopted paths and new release surfaces.
The portable inventory includes README.md, CONTRIBUTING.md and
RELEASE.md so adoption delivers the root documentation its consumers require.

Keep the public backlink, manifest digest, Core commits and adopter PR head in
the private migration receipt. Roll back with a reviewed revert to the adopter
base, preserving private configuration and disabling claims until canaries pass.
See `docs/adopter-readiness.md` for the complete runbook.

Named deployments in the source issue require approved write scope and verified
repository bindings. Fixtures prove compatibility, not live installation. Keep
exact release-bound blocked receipts outside Core when rollout authority or
runtime prerequisites are missing.
