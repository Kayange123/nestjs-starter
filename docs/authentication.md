# Authentication and sessions

Each successful login creates a separate persisted session. Access credentials are short-lived HS256 JWTs; refresh credentials are opaque random values, not JWTs. Session validation requires PostgreSQL availability and does not fall back to accepting a JWT when persistence fails.

## HTTP contract

| Endpoint               | Request                              | Success                             |
| ---------------------- | ------------------------------------ | ----------------------------------- |
| POST /v1/auth/register | firstName, lastName, email, password | 201 with token envelope             |
| POST /v1/auth/login    | userName (email), password           | 201 with token envelope             |
| POST /v1/auth/refresh  | refreshToken                         | 200 with replacement token envelope |
| POST /v1/auth/logout   | Authorization: Bearer accessToken    | 204; revokes current session        |

```json
{
  "data": {
    "accessToken": "<access JWT>",
    "refreshToken": "<opaque refresh credential>",
    "expiresIn": 900
  }
}
```

expiresIn describes the access token lifetime in seconds and may be shorter near session expiry. Send only accessToken in the Authorization header. Refresh credentials cannot access protected resources, and access tokens cannot refresh a session.

Refresh requests do not require an access token, but must present the valid refresh credential. Malformed DTOs return 400; invalid, expired, revoked or replayed refresh credentials return 401. Authentication throttling returns 429. Logout requires an active access token; repeating it with a revoked token returns 401. If access has expired, refresh before logging out.

Authentication does not use cookies or require CSRF tokens. Access credentials use the Authorization header and refresh credentials use the request body. Configure exact browser origins as described in [operations](operations.md).

## Rotation and revocation

- Session expiry is absolute: seven days by default. Refreshing does not extend it.
- Every refresh token contains a random token ID and a 256-bit random secret. Only its SHA-256 hash is persisted; the raw token is returned once to the client. A fast hash is appropriate here because the secret has high entropy, unlike a user password.
- A successful refresh marks the current token used and issues a new refresh credential in one database transaction. Consumed hashes remain available for replay detection.
- Reusing a consumed credential revokes that session/token family. Revocation commits before the 401 is returned.
- A guessed secret for a known token ID does not revoke a legitimate session.
- Strict replay handling intentionally has no retry/grace window. Concurrent use of one refresh token can invalidate even the request that initially succeeded. Serialize refresh operations across tabs/workers and reauthenticate after an ambiguous refresh response; do not blindly retry the old credential.
- Logout revokes the current login session only. Password changes revoke all sessions belonging to the affected user, including the current session. Clients must clear their credentials and log in again after changing a password.
- Access validation checks signature algorithm, issuer, audience, expiry, token purpose, user/session binding and persisted session state. Revoked or expired sessions cannot use otherwise unexpired access JWTs.
- User and session rows are locked in a consistent order for issuance, rotation and password changes. A previously verified password cannot create a session after a password change commits. Failed revocation rolls back the password update; failed issuance rolls back refresh consumption.

Revocation affects subsequent authorization checks; it does not cancel business work already authorized and running. Multiple device logins are independent sessions. Soft-deleted accounts fail both access and refresh checks.

## Configuration

| Variable                 | Default / requirement                                |
| ------------------------ | ---------------------------------------------------- |
| JWT_SECRET               | Required; random signing key, at least 32 characters |
| JWT_ACCESS_TTL_SECONDS   | 900; integer 60–3600                                 |
| AUTH_SESSION_TTL_SECONDS | 604800; integer 3600–2592000                         |
| JWT_ISSUER               | nestjs-starter                                       |
| JWT_AUDIENCE             | nestjs-api                                           |
| AUTH_THROTTLE_TTL_MS     | 60000; integer >= 1000                               |
| AUTH_THROTTLE_LIMIT      | 5; integer 1–100                                     |

Throttling is per authentication route and client IP using the current in-memory store. A shared store and trusted-proxy configuration must be considered for multiple instances; this milestone does not implement distributed rate limiting.

## Deployment and compatibility

Apply `AuthSessions1789214400000` after the users table exists and before deploying session-aware authentication. The migration adds auth_sessions and auth_refresh_tokens with user/session indexes and cascading foreign keys. Its up/down operations were tested against an isolated PostgreSQL schema. Use `pnpm db:migrate` to apply the migration chain; existing schemas require the [database upgrade procedure](database.md). Migrations do not run at application startup.

All previously issued JWTs require a fresh login: they lack the required session and purpose claims. Refresh tokens are no longer JWTs. The access-token payload contains sub, sid, type, issuer, audience, expiry and a unique token ID; clients should not rely on the former email claim. The response field names remain unchanged.

Replace the previously unused JWT_EXPIRATION and REFRESH_TOKEN_EXPIRATION settings with the explicit seconds-based settings above. The access-token default changes from one hour to 15 minutes.

Retain consumed refresh records until their session expires so replay remains detectable. Operational cleanup can delete expired sessions in bounded batches; the foreign key cascades remove their refresh history. No scheduled cleanup task is created by this change. Rolling back the session migration deletes session history and requires reauthentication.

Registration still creates the account before creating its first session. If session issuance fails after account creation, the account remains and the client can log in; this milestone does not make account creation and initial session issuance one transaction.

Email verification, recovery/reset flows and MFA remain future extensions. Their successful credential-reset paths must use the same user-lock and session-revocation transaction boundary. These features are not claimed as implemented.
