# Operational contract

## Authentication and browser requests

This API authenticates access tokens exclusively through `Authorization: Bearer ...`. Refresh tokens are supplied explicitly in the refresh request body. It does not read authentication cookies, issue session cookies or use Express sessions. The old CSRF middleware and cookie-session wiring have been removed because no ambient cookie credential authorizes requests. Clients no longer fetch or submit a CSRF token. If cookie authentication is introduced later, design CSRF defenses for that transport before enabling it.

`CORS_ORIGIN` is a comma-separated allowlist of exact HTTP(S) origins, for example `https://app.example.com,http://localhost:3000`. Paths, credentials and wildcards are rejected. An empty value permits no cross-origin browser access. Credentialed CORS is disabled. CORS controls browser access to responses; it is not authorization and does not block non-browser callers or guarantee that a request cannot be sent.

Helmet supplies security headers. Duplicate header middleware has been removed. Swagger is disabled in production, and production configuration rejects `SWAGGER_ENABLED=true`. Outside production it defaults on; Swagger does not persist bearer credentials. Set the example's `SWAGGER_ENABLED=false` when switching to production.

## Configuration

All application settings pass through the validated configuration service. Startup errors name no secret values; the compiled entry point exits nonzero on invalid configuration or failed startup. `JWT_SECRET` must contain at least 32 characters and cannot use the previous example placeholder. Generate a random secret; length validation does not establish entropy. `SESSION_SECRET` is no longer used.

| Setting             | Default and contract                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| `PORT`              | 3030; integer 1–65535                                                       |
| `BODY_LIMIT_BYTES`  | 65536; integer 1024–1048576, for JSON and URL-encoded bodies                |
| `HEALTH_TIMEOUT_MS` | 1000; integer 100–10000                                                     |
| `THROTTLE_TTL`      | 60000 milliseconds; integer 1000–3600000                                    |
| `THROTTLE_LIMIT`    | 100 per route/client/window; integer 1–10000                                |
| `CACHE_TTL`         | 300 seconds; converted to milliseconds for cache-manager; 0 disables expiry |
| `LOG_LEVEL`         | info; validated Winston log level                                           |

Oversized bodies return 413 and malformed JSON returns 400 through the standard error filter. File-upload limits remain a separate contract. `MAX_FILE_SIZE` does not override the JSON limit.

The global throttle now reads configuration and runs for application routes. Authentication routes also retain their stricter authentication throttle. Both limits use in-process storage: multiple replicas do not share a counter. Health probes are exempt. Proxy trust is disabled, so arbitrary forwarded addresses cannot evade limits. Behind a reverse proxy, clients currently share the proxy's address for limiting; configure a reviewed trusted-proxy topology and shared limiting strategy before a multi-replica deployment.

Runtime PostgreSQL connections have a 5-second connection timeout and 10-second query/client and server statement timeouts. Startup uses three connection attempts with 1-second retry delays. CLI migrations do not inherit runtime query timeouts. Readiness has its own shorter response deadline; an underlying query may continue until the runtime database timeout. Keep SQL logging disabled when handling credentials or other sensitive data.

## Health and shutdown

- `GET /v1/health/ping` is process liveness, returning `{ data: { status: "ok", timestamp } }` without database, disk or self-HTTP probes.
- `GET /v1/health/ready` checks PostgreSQL with a timeout and returns `{ data: { status: "ok" } }` on success. Failure returns HTTP 503 with the standard error envelope and `Service not ready`.
- `GET /v1/health` is an alias for readiness. The previous disk/memory details are no longer public.

Readiness indicates database connectivity, not migration currency. Apply migrations before starting the application. Monitor resource utilization through the deployment platform.

SIGTERM and SIGINT enable Nest shutdown hooks, which close the HTTP server and TypeORM pool. A compiled-process smoke test verified readiness followed by SIGTERM termination. Orchestrator draining, long-running requests and termination grace periods still require deployment-level testing.

## Logging

Each request receives a server-generated UUID in `x-request-id`; inbound IDs are not trusted. Completion logs contain that ID, method, route template, final status and duration. Request bodies, query strings, credentials, headers and raw identifiers are excluded. Unmatched routes use `unmatched`. This covers guard rejections and parser errors as well as successful controllers.

Winston writes structured console output; local production log files are no longer created. Unexpected exception responses do not expose stack traces or database messages, including in development. Domain errors and validation failures retain the existing envelope. New logging call sites must continue to avoid sensitive values; the logger is not a general-purpose secret scrubber.
