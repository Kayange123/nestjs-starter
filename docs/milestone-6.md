# Milestone 6 — configuration and operations

Completed for review. Milestone 7 has not started.

## Delivered

- A shared application configuration function used by actual bootstrap and full-module HTTP integration tests; bounded parsers, Helmet, versioning, validation and the existing response/error envelopes are installed consistently.
- Exact-origin CORS with credentials disabled; removed unused cookie-session/CSRF middleware and duplicate security headers. Access and refresh credentials remain explicit bearer/body inputs. No persistence or authentication-token format changes were needed.
- Validated ports, body limits, rate limits, health timeout, browser origins, JWT secret length/placeholder rejection and Swagger configuration. Production documentation is disabled; startup errors are sanitized and exit nonzero.
- Configuration-driven global rate limiting alongside authentication limits, health exemptions and disabled proxy trust. Cache TTL seconds are converted to the milliseconds expected by the installed cache runtime.
- Server-generated request IDs and structured console completion logs for success and failure paths. Removed local production file transports and development stack/database-message exposure.
- PostgreSQL readiness separated from process liveness. Removed self-HTTP, public disk and memory probes. Added runtime database timeouts, bounded startup retries and SIGTERM/SIGINT shutdown hooks.
- Updated README and [operational contract](operations.md), including client migration and deployment limitations.

## Verification

- Type checking, Nest build and 52 unit tests passed.
- 58 HTTP regression tests passed.
- 47 PostgreSQL integration tests passed across four suites. Eight new full-application tests cover production Swagger exclusion, CORS, headers, body limits, no-cookie authentication behavior, rate limiting, forwarded-address spoofing, request IDs/logging, readiness failure and recovery.
- The full application test uses the real AppModule, bootstrap configuration and a disposable PostgreSQL schema. It exposed and verified the correction of a named-throttle health exemption.
- A compiled `dist/main.js` smoke test migrated a disposable schema, observed readiness, sent SIGTERM and observed process exit within ten seconds. A second process with invalid configuration exited 1 without revealing the invalid secret.
- No existing application database was changed. Disposable database resources were removed after verification.

## Review and remaining work

Clients should remove CSRF-token fetching and cookie-session assumptions, configure exact CORS origins, and consume the simplified readiness response. Production environments must provide a random JWT secret and set Swagger off. These are intentional operational contract changes.

Throttling remains per process, and proxy trust remains disabled; multi-replica limiting and trusted-proxy topology require deployment decisions. The health deadline does not cancel the underlying PostgreSQL query immediately; runtime query/server timeouts bound its remaining lifetime. The SIGTERM check does not prove orchestrator draining or long-running-request behavior. Readiness checks connectivity, not migration history. JSON limits do not replace upload-specific limits.

The known ESLint 9 configuration mismatch, unused/deprecated dependencies, container packaging and CI hardening remain milestone 7. Final documentation/release review is milestone 8. No production-readiness claim is made.

Pause here for review before milestone 7.
