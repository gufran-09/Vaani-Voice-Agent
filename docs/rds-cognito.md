# RDS PostgreSQL and Amazon Cognito

The application no longer uses Supabase. Browser requests use the local
`lib/api.ts` compatibility client, which calls Next.js API routes. Only those
server routes connect to Amazon RDS, so `DATABASE_URL` is never exposed to the
browser.

## Required environment

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL` — the RDS PostgreSQL connection string
- `DATABASE_SSL=true` for an RDS deployment
- `AWS_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`

The Cognito app client must allow `USER_PASSWORD_AUTH`. Configure email
confirmation and a verified sender in Cognito. The sign-up screen reports that
the user must confirm their email when Cognito does not auto-confirm accounts.

## Initialize RDS

Run the schema from a machine that can reach the private RDS endpoint:

```powershell
$env:DATABASE_URL = "postgresql://vaani_app:password@rds-endpoint:5432/vaani"
psql $env:DATABASE_URL -f db/schema.sql
```

Do not commit `.env.local`, passwords, or access keys. Prefer an RDS security
group that permits port 5432 only from the application runtime, and store the
connection string in AWS Secrets Manager or the hosting provider's secret
store.

## AWS setup

Create an RDS PostgreSQL database and Cognito user pool in the same region.
The application runtime needs permission to call Cognito `GetUser` and
`InitiateAuth`; it does not need broad administrator permissions. Enable
Multi-AZ/backups and set a recovery retention period before production use.

Run:

```powershell
npm run typecheck
npm run build
```
