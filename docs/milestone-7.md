# Milestone 7 — dependencies, tooling, Docker and CI

Completed for review. Milestone 8 has not started.

## Delivered

- Removed unused runtime dependencies, updated the lockfile within existing framework majors, aligned Express 5 with Nest 11, and applied a scoped Multer 2.3.0 security override.
- Replaced broken legacy ESLint configuration with flat configuration, upgraded to supported ESLint 10, made lint non-mutating, added a formatting check, and repaired local hook commands.
- Recorded Node 22.22.3 and pnpm 11.3.0 consistently. Automated installs use the frozen lockfile with lifecycle scripts disabled.
- Pinned the Node container manifest, separated build/runtime dependencies, switched runtime to non-root, excluded local metadata/secrets from the build context and replaced wget health checks with Node fetch.
- Added a reusable disposable container smoke test. CI now exercises real PostgreSQL integration tests, builds the image and runs that smoke test.
- Replaced automatic placeholder SSH deployments with manual, verification-gated image publishing. No remote publishing or deployment was executed.

## Validation

- ESLint, formatting, type checking and Nest build passed.
- 52 unit, 58 HTTP and 47 PostgreSQL integration tests passed after dependency updates.
- The initial audit reported 17 low, 47 moderate, 69 high and 3 critical findings. Final full dependency audit reported zero known vulnerabilities.
- Production image built from frozen installs. Container migrations, seeding, readiness, built-in health command, non-root/read-only operation, exclusion of source/environment files and ESLint, and graceful stop were verified with disposable Docker resources.
- Workflow YAML was parsed/formatted locally. Remote CI execution, registry publishing and production deployment remain unverified.

## Review notes

See [tooling and delivery instructions](tooling.md). Dependency audit results do not cover operating-system packages. The pinned Node version matches the verified local runtime; pinned images require ongoing patch review. Some upstream development dependencies still report deprecation notices. The final production image has no pnpm executable: invoke its compiled database CLI through Node.

No existing database was changed, no commits were created and no images were published. Pause before milestone 8, the final documentation and release review.
