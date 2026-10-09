# Milestone 3C — Authentication and Session Security

## Scope

This milestone hardens the existing Supabase Auth integration without starting
the PostgreSQL migration or deploying any cloud resources. Supabase remains the
identity provider and the database remains protected by the existing
organization and property RLS policies.

## Implemented

- The browser auth provider now cleans up its `onAuthStateChange` subscription
  and ignores asynchronous state updates after unmount.
- Sign-up passes the user's full name to Supabase Auth so the existing profile
  trigger can populate `profiles.full_name`.
- Global sign-out revokes the user's active Supabase sessions instead of only
  clearing the local session.
- Authentication failures are surfaced to the existing UI without logging
  passwords, tokens, or provider secrets.
- Existing organization and property queries continue to be scoped through the
  authenticated Supabase user and database RLS policies.
- The application continues to require
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; it does not
  fall back to arbitrary-password or mock authentication.

## Configuration required before a real deployment

Configure these controls in the Supabase project before using real customer or
staff data:

1. Enable email confirmation and configure the approved redirect URLs.
2. Set the password policy and session lifetime appropriate for the business.
3. Configure secure transport and production site URLs.
4. Review Auth rate limits and add an edge/API rate limiter if the application
   exposes custom authentication endpoints.
5. Keep service-role keys server-side only; never expose them through
   `NEXT_PUBLIC_*` variables.
6. Review the existing RLS policies with representative cross-tenant tests.

## Production gap register

The following items remain open because this repository has no custom server
authentication/API layer:

| Control | Status | Reason |
| --- | --- | --- |
| Real authentication provider | Implemented | Supabase Auth is used for sign-in and sign-up. |
| Session refresh and logout | Implemented | Supabase auto-refresh is enabled and global sign-out is used. |
| Server-side session revocation | Provider-configured | Supabase must be configured and verified in the project dashboard. |
| Secure HTTP-only cookies | Open | The current client-only integration uses the Supabase browser client; adopt `@supabase/ssr` and server middleware before production. |
| CSRF protection | Open | No custom cookie-authenticated state-changing API routes exist yet. Add origin/CSRF validation with the server API. |
| Authentication rate limiting | Provider-configured | Configure Supabase Auth limits; add server/edge limiting for custom endpoints. |
| Tenant/property authorization | Implemented at database boundary | Existing RLS policies and membership/property checks remain authoritative. Add API regression tests when server routes are introduced. |
| PostgreSQL migration | Intentionally deferred | It belongs to Milestone 3D, not this milestone. |

Passing local type checks does not constitute production readiness.

## Verification

Run from the project root:

```text
npm run typecheck
npm run build
```

Local development still requires the two Supabase public environment variables,
but it does not require AWS credentials or any paid AWS service.
