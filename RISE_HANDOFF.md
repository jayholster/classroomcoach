# Classroom Coach — RISE Engineering Handoff

## Executive summary

Classroom Coach is an early but coherent vertical slice for educator-governed simulation authoring, rehearsal, review, and research dataset construction. The reusable core is strongest where structured domain state, server-side authorization, immutable scenario versions, ordered rehearsal events, and dataset field definitions meet. The current product should not be treated as a finished institutional platform: assignment membership, durable processing, model operations, privacy governance, accessibility validation, and automated end-to-end testing need substantial work.

## Reuse first

### Application foundation

- Keep the TanStack Start v1 routing and server entry: `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/_authenticated/route.tsx`, `src/start.ts`, and `src/server.ts`.
- Keep the current authenticated route structure and the direct user workflows in `src/routes/_authenticated/` unless product requirements change.
- Keep TanStack Query as the server-state cache, but standardize mutation/invalidation conventions before adding features.
- Keep the semantic token system in `src/styles.css` and the existing AppShell visual language; the current request is an engineering handoff, not a redesign.

### Domain model

- Reuse `src/lib/spec/schema.ts` as the canonical scenario/participant/scene/turn/review contract.
- Reuse publication-time participant snapshots and the fixed-cast rule. They are important for reproducibility and should remain immutable after publication.
- Reuse ordered `simulation_events` plus `simulation_states` as the source of truth for rehearsal reconstruction.
- Reuse `commit_simulation_event` as the atomic commit boundary, then harden/test it rather than creating another turn-write path.
- Remove or formally deprecate the unused `commit_simulation_turn` RPC after confirming no deployed client depends on it.

### Authorization and governance

- Reuse server-function authentication, organization context helpers, RLS, research scope resolution, audit events, and the separate role tables.
- Treat `src/lib/server/orgContext.server.ts` and database policies as security-critical code requiring independent review.
- Reuse the central gateway boundary in `src/lib/ai/gateway.server.ts`; do not add direct provider calls in routes or feature functions.
- Reuse the research field registry/data dictionary approach so exports remain documented and controlled.

## Rebuild or materially harden

1. **Async processing:** replace synchronous/browser-heavy document and model workflows with durable jobs/statuses when institutional files or request volume require it.
2. **Model operations:** validate supported model IDs, add provider health/circuit-breaking/quotas, version prompts and schemas, and build a regression set for scenario derivation, turn continuity, latent reveals, scenes, and endings.
3. **Assignments:** complete invitations, group membership, learner assignment access, scheduling enforcement, notifications, and instructor workflow.
4. **Research governance:** add consent/participant lifecycle, retention/deletion, complete lineage for every export field, and fill currently null research variables or remove them from supported exports.
5. **Security/privacy:** threat model, penetration test, file scanning, PII controls, contractual data governance, deletion/retention enforcement, and full RLS validation.
6. **Observability:** correlation IDs, metrics, alerts, durable audit guarantees, and tenant/model operational dashboards.
7. **Quality:** browser E2E, accessibility, model contract, load, migration, visual, and recovery testing.

## Known current limitations

- Feature routes use client-side React Query fetches; no route data loaders are currently used.
- Browser extraction is the only document extraction path; retrieval is keyword-overlap, not embeddings.
- Provider SSE is used internally, but the browser waits for a completed turn and refetches the session; there is no end-user incremental streaming path.
- There is no current deterministic fallback engine when the model is unavailable.
- Assurance checks are computed in memory; the `assurance_runs` table is not populated by the current path.
- Research `group_id` and `assurance_run_count` are currently emitted as `null` in dataset assembly.
- Organization retention and usage-limit columns exist without audited enforcement code.
- A broad UI component scaffold exists, but feature screens mainly use AppShell class-string primitives.
- No repository browser E2E suite or automated accessibility suite was found.

## Suggested engineering sequence

1. Freeze the current schema/spec/event contracts and document deployed migration state.
2. Build authorization, migration, and end-to-end smoke tests around the existing vertical slice.
3. Harden the model gateway and add model contract/golden tests before changing prompts or routing.
4. Move document/model/review work to durable processing only where measurements justify it.
5. Complete assignment and research governance for the target institution.
6. Add retention, deletion, privacy, observability, accessibility, and load-readiness controls.
7. Only then decide which existing UI primitives to consolidate or which workflows need product redesign.

## Key entry points

- Frontend routes: `src/routes/`
- Auth: `src/hooks/useAuth.ts`, `src/integrations/supabase/auth-middleware.ts`, `src/start.ts`
- Server functions: `src/lib/api/*.functions.ts`
- AI: `src/lib/ai/gateway.server.ts`, `modelAdapter.server.ts`, `prompts.server.ts`
- Domain contracts: `src/lib/spec/schema.ts`
- Research: `src/lib/research/fields.ts`, `scope.server.ts`
- Database contract: `src/integrations/supabase/types.ts`
- Migrations: `supabase/migrations/`
- Security/operations notes: `SECURITY.md`, `OPERATIONS.md`
