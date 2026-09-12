# Milestone 3: explicit user queries and bounded pagination

## Result

Replaced the 312-line generic query DTO with a pagination-only DTO, a user-specific query DTO, a small TypeORM mapper and a reusable pagination response helper. The existing users module and service/repository relationship remain intact; no dependencies were added or updated.

The user list retains q, page, limit, sortBy, order and the data/pagination envelope. It rejects all, fields, sorts, nested dateRange, arbitrary sorting, arbitrary relations and unknown filter fields. Date bounds are explicit timezone-qualified timestamps. Search is literal and parameterized. Every query has take/skip and a deterministic ID tie-breaker.

Swagger now documents inherited pagination defaults and limits, allowed user sorts, date filters and the actual paginated response. PaginationMeta has a shared definition, with a compatibility re-export for the existing response transformer.

See [the complete query contract and upgrade notes](user-queries.md) for intentional breaking changes and the cursor extension point.

## Validation

| Check | Final result |
| --- | --- |
| pnpm typecheck | Passed |
| pnpm build | Passed |
| pnpm test --runInBand | 27 tests passed in 4 suites |
| pnpm test:e2e --runInBand | 58 tests passed in 3 suites |
| pnpm test:integration with disposable PostgreSQL 16 | 12 tests passed |
| Prettier check over milestone files | Passed |
| git diff --check | Passed |

PostgreSQL checks use actual entities, repository queries, service response mapping and a unique test schema. They cover filtered counts, soft deletes, inclusive date bounds, one-sided date bounds, all allowed sorts in both directions, tied timestamps across pages, email/last-name search, literal wildcard handling, parameter binding, empty results and final-page metadata. The disposable container and its data were removed after the checks.

Initial integration setup failed because the random schema needed explicit creation before synchronization; the harness was corrected. The Swagger test initially had invalid TypeScript narrowing; that was corrected before the final passing runs. No failures were suppressed.

The existing ESLint configuration mismatch remains open from milestone 1; this milestone does not claim a clean repository-wide lint run. These checks do not constitute full deployment or load testing. The integration command is available but broad CI wiring remains scheduled for milestone 7.

## Review decisions

- Preserve existing uppercase ASC/DESC instead of introducing unnecessary parameter renames.
- Keep default limit 10 and maximum 100. Reject alternate numeric syntax and duplicate values rather than silently coercing them.
- Use server-controlled searchable fields and fixed response DTOs; no generic projection capability remains.
- Do not add status/role filters, cursor implementation, new dependencies or a generalized query framework without a resource requirement.
- Stable ordering fixes ties for unchanged data; it does not promise consistency across concurrent writes. Deep-offset and substring-search costs remain workload-dependent.

No application database was migrated and no commit or deployment was performed. Pause before milestone 4 (authentication sessions, access/refresh separation, rotation and revocation). Previously issued JWTs and current refresh-token behavior remain unchanged by this milestone.
