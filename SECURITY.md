# Classroom Coach — Security and Privacy Notes

This document describes how the deployed application protects data. It is
written for the people responsible for running it, not only for developers.

## Accounts and sign-in

- Sign-in is by email and password or Google. There is no anonymous access and
  no self-serve elevation to administrator.
- Every authenticated route lives under the protected layout. Signing out
  clears the session and returns the person to the sign-in page.
- A profile row and a personal workspace organization are created
  automatically on first sign-in. Pending invitations for that email address
  are accepted at the same moment.

## Roles

Roles are stored in `user_roles` and in `organization_memberships` — never on
the profile record, and never in browser storage.

| Role | Can do |
| --- | --- |
| Learner | Rehearse assigned published simulations, see their own sessions and reviews |
| Educator | Everything a learner can, plus author, publish, assign, and manage their groups |
| Admin / research | Everything above, plus assurance, model configuration, audit trail, system health |

The interface hides what a role cannot use, but that is convenience only. The
enforcement points are Row Level Security in the database and the server-side
checks in `src/lib/server/orgContext.server.ts`.

## Data isolation

- Every substantive table carries `organization_id` and is protected by Row
  Level Security scoped through `is_org_member` / `is_org_admin`.
- Learners can read a published version only through an assignment, and can
  read only their own sessions, events, flags, and reviews.
- Draft specifications and latent (hidden) participant information are never
  readable by learners, in any query path.
- Context documents live in a private storage area partitioned by user id.
  Deleting a document in the interface removes the stored file as well.

### SECURITY DEFINER functions

The database linter flags several `SECURITY DEFINER` functions as callable by
signed-in users. This is deliberate and reviewed:

- `has_role`, `is_org_member`, `is_org_admin`, `is_group_member`,
  `can_access_version` exist to make RLS policies non-recursive. Each one only
  answers a question about the caller's own membership and returns a boolean.
- `commit_simulation_turn` performs its own ownership check
  (`owner_id = auth.uid()`) and refuses ended rehearsals before writing.

`EXECUTE` on all of them is revoked from `public` and `anon` and granted only
to `authenticated`.

## Secrets

- No provider credential appears in client code, in the database, or in a
  committed file. Model configurations store only a *reference name*; the
  value is read from the server environment at call time.
- `SUPABASE_SERVICE_ROLE_KEY` is used only for privileged maintenance paths
  and is never sent to the browser.

## Privacy

- Every free-text entry point carries a standing reminder not to enter
  identifiable information about real students, families, or colleagues.
- Non-production deployments show a persistent environment banner.
- Prompts, uploaded document contents, and model output are never written to
  application logs. Logs contain identifiers, timings, and error classes only.

## Reporting

Send security concerns to the address configured in `VITE_SUPPORT_EMAIL`
before disclosing them publicly.
