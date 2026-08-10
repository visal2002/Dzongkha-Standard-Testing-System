# ADR-002: Short-lived access tokens with revocable server sessions

## Status

Accepted for baseline; NDI details remain external.

## Decision

Issue 15-minute signed access tokens and rotate an opaque refresh token in an HttpOnly, Secure, SameSite cookie. Persist only the refresh-token hash and session metadata. Enforce inactivity and revocation server-side. Administrative local-password login is rejected because the NFR mandates NDI.

## Consequences

- Frontend production code must stop trusting localStorage tokens and user permissions.
- Logout and refresh-token compromise can be contained by revoking the server session.
- Final NDI callback validation must add persisted state, nonce and PKCE once the official protocol is supplied.
