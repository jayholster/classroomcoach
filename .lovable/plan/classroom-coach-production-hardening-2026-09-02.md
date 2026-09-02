# Classroom Coach — Production Hardening

The existing vertical slice (Design Lab → spec → publish → rehearsal → events → flags → review) stays as-is. This phase adds the tenancy, permissions, reliability, auditability, and documentation layers needed for real educators and learners, plus honest reporting of what still requires configuration.

Current state confirmed by inspection: no localStorage is used for app data; scenarios/versions/sessions/events/flags/assurance_runs already persist in the backend; `courses_or_groups` and `assignments` tables exist but nothing in the UI uses them; there are no `organizations`, `organization_memberships`, `group_memberships`, `foundation_versions`, `after_action_reviews`, `audit_events`, or model-usage tables; roles exist (`admin`/`educator`/`learner`) but only the admin path is enforced server-side; there is no test runner installed.

Because this is a large scope, it is split into six phases. Each phase ends with a working app.

## Phase 1 — Tenancy, roles, and access control

Migrations:
- `organizations`, `organization_memberships`, `group_memberships`, and columns to attach existing tables to an organization; `assignments` gains group, open/close dates, and status.
- Security-definer helpers (`current_org_ids`, `is_org_admin`, `is_group_member`, `can_view_session`) so policies never recurse.
- Rewrite RLS across every table so access is scoped to organization/group membership, not just `owner_id`. Learners get read access to assigned published versions only — never to `draft_spec`, latent information, or foundation bodies.
- Indexes, `created_by`, `updated_at`, and `archived_at` (soft delete) where missing. Published versions stay immutable.

App:
- Server-side permission checks in every server function (never rely on hidden buttons).
- Group management screens for educators: create group, invite by email, add/remove members, assign a published version, see assignment status.
- Learner home: Assigned Rehearsals with status and Start/Resume.
- Sanitize learner-facing payloads server-side so latent info and system instructions cannot reach the browser.

## Phase 2 — Turn safety, model gateway, validation

- Transactional turn handling: ownership check → exact version → current state (with version/`state_seq` optimistic lock) → pending event → model call → schema validation → persist response + state → finalize. A failure at any step leaves the simulation unadvanced; a concurrent second request is rejected rather than interleaved.
- Single server-side model gateway with per-configuration timeout, bounded retries, rate/concurrency limits, structured error mapping, and latency/token/cost logging into a new `model_usage_events` table. Credentials stay server-side and are referenced by name, never stored in the DB.
- All four AI functions (`generateStructuredScenario`, `runSimulationTurn`, `generateAfterActionReview`, `runAssuranceCheck`) validate output with Zod, attempt exactly one repair call, then fail cleanly with a Retry affordance. No fabricated fallback content.
- `after_action_reviews` becomes its own table (currently a JSON column on the session).

## Phase 3 — Documents, retrieval, provenance

- Ingestion state machine: Uploading → Queued → Processing → Ready → Failed, with recorded error text, Retry Processing, and Delete.
- Deleting a live document keeps an immutable source-reference record so published versions retain provenance.
- Retrieval extracted into its own service module with a keyword-scoring implementation now and a pgvector implementation behind the same interface, chosen by config. Only relevant chunks are sent to the model; retrieved chunk IDs are recorded per generation.
- Provenance completion: every session and event records scenario, version, foundation version, people-profile version, context source versions, app build ID, provider, model, and configuration version. No chain-of-thought is ever stored or displayed.

## Phase 4 — Audit, observability, cost, assurance

- `audit_events` table (actor, action, object, object version, timestamp, metadata) written for scenario create/revise/publish/archive, foundation change, assignment create, model config change, document upload/delete, export, assurance run.
- Structured server-side logging for model calls/failures/latency, ingestion, generation, turn failures, validation failures, retries, DB errors — with document contents and PII excluded.
- Admin System Health page: recent failures, model availability probe, ingestion backlog, average latency, failed generation count, active configuration.
- Admin usage views: by day, by organization, by model, with estimated cost and configurable (default-off) limits.
- Assurance becomes a real baseline regression system: freeze a test moment (version + prior state + learner action), re-run it repeatedly, store each run's provider/model/config/output/state update. Deterministic checks only; semantic categories are labeled "Requires semantic/human review". No safety scores.

## Phase 5 — Privacy, exports, UX quality

- Retention configuration fields for documents, sessions, and exports; account/data deletion workflow.
- Interface reminders not to upload identifiable information about real students, families, or colleagues.
- Authorized research export (CSV/JSON) with pseudonymous IDs, scoped to the requester's organizations, excluding system prompts, logged in `audit_events`.
- Accessibility pass: keyboard paths, visible focus, semantic headings, labeled forms, accessible dialogs, live-region status messages, contrast, non-color error signaling, accessible tables and a non-drag file alternative. Remaining issues documented; no compliance claim.
- Real empty and error states for all listed cases, each saying what happened, whether work was preserved, and what to do next. No stack traces to ordinary users.
- Pagination and query tightening for library, sessions, events, and review reconstruction.

## Phase 6 — Tests, CI, documentation, readiness

- Vitest plus integration tests covering the listed authorization, authoring, rehearsal, provenance, flag, review, and document cases — including that a failed generation does not corrupt state and a deleted source does not invalidate a published version.
- CI workflow: typecheck, lint, tests, build, migration validation; deployment blocked on failure.
- Docs: `DEVELOPMENT.md` (local/staging/production, environment variables, restore-from-scratch), `SECURITY.md` (auth, authz, storage, model communication, secrets, logging, deletion, known risks, external services, data-flow diagram), `BACKUPS.md` (documented only where actually configured by the host), a load-test script, and in-product Educator/Learner/Admin quick starts.
- Production Readiness page (admin-only) that derives each item's status from real application/configuration state and marks anything unverifiable as "Needs configuration" or "Needs review" rather than Ready.

## Notes on constraints

- No redesign, no new product surfaces beyond those above, no scoring, no chain-of-thought exposure, no compliance claims.
- Environment/configuration: this app runs on Lovable Cloud, which supplies one managed backend per project plus preview and published deployments. Configuration is read from environment variables through a single config module; true three-way dev/staging/production separation with distinct credentials requires separate Lovable projects and will be documented as configuration still required rather than claimed as done.
- Final deliverable is a report with IMPLEMENTED / CONFIGURATION STILL REQUIRED / RECOMMENDED EXTERNAL OR HUMAN REVIEW sections.

## Suggested order

Phases run in sequence, each verified end to end in a browser against the real backend before moving on. If you would rather I compress this, the highest-value subset is Phases 1, 2, and 6.
