# NestJS API Starter

A NestJS 11 and TypeORM PostgreSQL starter with persisted authentication sessions, explicit user-query contracts and a tested container workflow. The eight-step hardening implementation is complete; [release readiness](docs/release-readiness.md) records the evidence and deployment work that remains.

## Included

- Short-lived access JWTs, rotating opaque refresh tokens, replay detection and logout/session revocation.
- Admin and owner authorization, safe user response mapping and strict DTO validation.
- Bounded offset pagination with resource-specific search, date filters and sort allowlists.
- Versioned APIs, configurable development Swagger, exact-origin CORS, Helmet and body limits.
- PostgreSQL migrations and repeatable seeds with no default administrator credentials.
- Request IDs, structured logs, liveness/readiness, shutdown hooks and a non-root production image.
- Lint, formatting, type checking, unit/HTTP/database tests and container verification in CI.

Permissions are stored in the schema; current user routes enforce roles/ownership. There is no general permission-management API, tracing backend, email verification, password recovery or MFA.

## Start locally

Use Node **22.22.3**, pnpm **11.3.0**, and PostgreSQL 16. Docker is optional when PostgreSQL is already available.

```sh
pnpm install --frozen-lockfile --ignore-scripts
cp .env.example .env
```

Set database credentials and a random `JWT_SECRET` of at least 32 characters in `.env`. Keep `DB_SYNC=false`. For a local database:

```sh
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm start:dev
```

Seeding creates roles and permissions only. Supply administrator credentials explicitly when needed; see [database setup and upgrades](docs/database.md). Existing databases must follow the upgrade procedure before running migrations.

The API defaults to port 3030. Swagger is at `/docs` outside production when enabled. Production requires `SWAGGER_ENABLED=false`.

## API contracts

Authentication routes are under `/v1/auth`. Login accepts `userName` and `password`; successful login/register returns `{ data: { accessToken, refreshToken, expiresIn } }`. Send access tokens in `Authorization: Bearer ...`; refresh tokens are explicit request-body values. No authentication cookie or CSRF-token exchange is used. See [authentication](docs/authentication.md).

User listing requires Admin authorization:

```http
GET /v1/users?page=1&limit=10&q=kayange&sortBy=createdAt&order=DESC
```

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Page size is limited to 100. Search is a literal substring of name/email; date filters use `createdFrom`/`createdTo`. Sortable fields are `id`, `firstName`, `lastName`, `email`, and `createdAt`. Arbitrary fields, relations, multi-sort and unpaginated requests are rejected. See [query and pagination contract](docs/user-queries.md).

Individual user reads and updates require ownership or Admin. Create/list/delete require Admin. Individual user responses use `{ data: user }`; logout returns 204. Errors use `{ statusCode, message, timestamp, ... }`. [Release notes](CHANGELOG.md) enumerate intentional breaking changes.

## Verify and build

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test --runInBand
pnpm test:e2e --runInBand
pnpm build
```

Set `TEST_DATABASE_URL` to a disposable PostgreSQL database, then run `pnpm test:integration`. The suites create/drop isolated schemas.

```sh
docker build --target production -t nestjs-starter:local .
node scripts/container-smoke.cjs nestjs-starter:local
```

The smoke test creates and removes its own Docker resources. The production image starts Node directly; execute database jobs as `node dist/database/cli.js migrate` in a separate container. Development Compose uses source mounts and is not a production deployment configuration. See [tooling and delivery](docs/tooling.md).

CI runs verification and a production dependency audit. Publishing to GHCR is manual and gated on CI; no deployment is automated. Registry tags identify commits, but deployments should use image digests.

## Operations and contribution

Liveness: `/v1/health/ping`. PostgreSQL readiness: `/v1/health/ready` and `/v1/health`. Readiness failures return 503. CORS uses an exact-origin allowlist. Rate limits and caching are per process; proxy trust is disabled. See [operations](docs/operations.md) before deploying behind proxies or using multiple replicas.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [engineering report](docs/engineering-report.md). The package is intentionally private to prevent accidental npm publication. Maintainer identity, security reporting ownership and license publication must be confirmed before an external release.
