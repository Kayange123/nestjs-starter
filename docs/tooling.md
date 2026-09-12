# Tooling and container delivery

Use Node 22.22.3 and pnpm 11.3.0, recorded in `.node-version`, `engines` and `packageManager`. CI and Docker use the same versions. Run `pnpm install --frozen-lockfile --ignore-scripts` for automated verification; dependency lifecycle scripts are deliberately disabled. Local Git hook installation is optional via `pnpm prepare` after reviewing the hooks.

`pnpm lint` is non-mutating and fails on warnings. ESLint uses its flat configuration with TypeScript rules; `pnpm lint:fix` explicitly enables fixes. `pnpm format:check` checks source/test formatting. Hooks use locally installed pnpm executables, avoiding an implicit npx download.

The lockfile refresh retains Nest 11 and TypeORM 0.3. Express now matches the Nest 11 adapter's Express 5 major. Removed direct dependencies include obsolete cookie/CSRF/session packages, unused bcrypt, pagination and multipart packages, and unused Swagger/HTTP wrappers. Multer remains a Nest adapter dependency. `pnpm-workspace.yaml` scopes an override to Multer 2.3.0 until the adapter advances its pin; retain and reassess this override during upgrades. ESLint moved to supported major 10, accepted by the installed TypeScript plugin.

## Production image

```sh
docker build --target production -t nestjs-starter:local .
node scripts/container-smoke.cjs nestjs-starter:local
```

The smoke test creates its own network and PostgreSQL/API containers, applies migrations, seeds roles, checks readiness and the image health command, checks artifact exclusions and non-root execution, and stops the API. It removes its resources in a `finally` block and never connects to an existing database.

The Node image is pinned by version and manifest digest. The runtime includes compiled output and production dependencies, runs as `node`, and starts Node directly. It contains no pnpm CLI; database jobs run `node dist/database/cli.js migrate` (or `seed`, `show`, `baseline`, `revert`, `seed-admin`) in a separately invoked container with the appropriate environment. Application startup still does not apply migrations automatically.

The health command uses Node fetch with a deadline and respects `PORT`; it does not require wget or curl. The image was tested with a read-only root filesystem, `/tmp` tmpfs, dropped capabilities and `no-new-privileges`. Supply environment secrets at runtime. The build context excludes Git metadata, local caches, environment files and agent configuration. Development Compose remains for local use; use the production image directly in a reviewed deployment configuration.

## CI and publishing

CI uses immutable checkout/setup-node action commits, read-only repository permissions, bounded job duration, frozen installs, lint/format/typecheck, unit/HTTP/PostgreSQL tests, application build, a high-severity production dependency audit, Docker build and the container smoke test.

The former automatic SSH deployment placeholders are removed. The manual publishing workflow first calls the same CI workflow, then builds and publishes a commit-SHA image tag to GHCR. No deployment or image pruning occurs. Commit tags identify source, but a registry tag is technically mutable; use the resulting digest in deployment configuration. CI and publishing were inspected locally; no remote GitHub run or registry publication was performed.

A registry audit reported zero known advisories after the updates. This is a time-bound dependency result, not proof of security, and does not cover base-image operating-system packages. Four upstream development dependency deprecations remain (git-raw-commits, two glob versions, inflight); the audit reported no advisories for them. Pin updates and base-image vulnerability review remain ongoing maintenance.
