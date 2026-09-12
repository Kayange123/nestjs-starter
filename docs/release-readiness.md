# Release readiness

The eight-milestone implementation is complete and ready for maintainer review and deployment-specific staging validation. It is not an approval to deploy publicly. No release tag, commit, registry publication or deployment has been created.

## Evidence

Milestones 2–7 introduced regression coverage for user security, request/query validation, PostgreSQL pagination, persisted sessions, migrations/seeds and operational middleware. Milestone 7 passed 52 unit, 58 HTTP and 47 PostgreSQL tests, lint, formatting, type checking and build. Its full dependency audit reported zero known advisories at execution time. Frozen Docker installs and a non-root/read-only container smoke test passed.

Milestone 8 corrects current documentation and user OpenAPI envelopes, adds one OpenAPI contract test and release/contribution materials. Historical milestone reports describe their checkpoint state; use the current guides rather than historical operational instructions.

## Before deployment

- Test existing-schema adoption and migrations on a representative database clone; prove backup restoration. No deployed database was inspected or modified.
- Choose a trusted reverse-proxy topology and distributed rate limiting when running replicas. Current proxy trust is disabled and counters are local to each process.
- Supply random secrets, exact browser origins and production settings. Review database transport/TLS and network isolation for the target environment; no deployment TLS policy was implemented.
- Verify image operating-system advisories and current Node patch suitability. The package audit does not scan OS packages. Test the target CPU architecture, orchestrator shutdown/draining and termination grace period.
- Run remote CI on the candidate revision and record its image digest. Local verification does not prove GitHub permissions, registry credentials or deployment behavior.
- Plan bounded expired-session cleanup. Used refresh hashes must remain until their session expires for replay detection.

## Before an external/open-source release

The package says MIT but the repository has no LICENSE file. The maintainer must confirm licensing and copyright ownership before publication. Author identity, CODEOWNERS assignments, moderation ownership, a monitored private security channel and supported release policy were not invented. Contributor rules, a security-reporting guide, changelog and PR/issue templates are included. The package remains private to prevent accidental npm publication.

## Known functional limits and roadmap

Email verification, password recovery and MFA are not implemented. Registration and first-session creation are separate transactions: a session-issuance failure can leave a valid account that must log in. New users receive no automatic role assignment; owner access still works, while Admin access comes from explicit bootstrap. Email matching remains case-sensitive and field lengths remain constrained by the existing schema.

Offset pagination is deterministic for a fixed dataset but not a cross-request snapshot. Deep offsets and substring searches can be expensive. Evaluate representative query plans before choosing cursor pagination or additional indexes. No generic projections or arbitrary relation loading are exposed.

Readiness checks database connectivity, not migration currency. Health response deadlines do not immediately cancel the underlying query. There is no tracing backend or metrics exporter. Add OpenTelemetry when an operational consumer and retention/privacy policy exist. A resource generator remains roadmap work until repeated modules demonstrate useful conventions.

Meaningful risk-focused tests take precedence over an invented global coverage target; coverage reporting is available, but a coverage threshold remains unset. Remaining upstream development dependency deprecations are documented in tooling.md. These limitations must not be described as implemented features.
