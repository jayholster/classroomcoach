# Classroom Coach — Production Gaps

This document separates the current implementation from the work required for a real institutional deployment. It is a gap assessment, not a proposed redesign.

## Security

- Run a formal threat model and penetration test for auth, organization isolation, research scopes, private storage, file processing, model prompts, and privileged server-client usage.
- Independently verify every RLS policy against the intended learner/educator/admin/research matrix. The UI role filter is convenience only; the backend must be treated as authoritative.
- Review all `SECURITY DEFINER` functions for ownership, `search_path`, execute grants, actor validation, and privilege escalation. In particular, verify both current and legacy simulation commit RPCs and ensure the unused path cannot be abused.
- Verify that no non-server module imports `client.server.ts` or otherwise makes the privileged client reachable from a browser bundle. Add a CI guard for this invariant.
- Harden file handling: validate MIME by content signature, protect against decompression bombs and malformed PDFs/DOCX, cap extracted text/chunk counts, scan uploads, and isolate parsing from request execution.
- Add CSRF, replay, rate-limit, and abuse tests for all server functions, especially model generation, turn submission, flagging, assignment creation, and exports.
- Review preview auth storage/message-origin behavior in a production threat model; preview-specific brokers should not silently weaken published-app session isolation.
- Confirm OAuth redirect allowlists, email verification behavior, password reset, account recovery, session expiry, logout invalidation, and provider configuration in each environment.
- Establish least-privilege database roles and remove any unnecessary direct client table grants. Verify service-role use is limited to server-only transactional paths.
- Add security headers, CSP, clickjacking protection, secure cookie settings, and dependency/software supply-chain scanning at deployment.

## Scalability

- Replace per-process in-memory model concurrency gates with a distributed quota/queue strategy. The `inFlight` map in `gateway.server.ts` does not coordinate across Worker instances.
- Define tenant quotas for model calls, tokens, storage, exports, and active sessions. Existing organization usage-limit columns are not enforced by current source.
- Move long document extraction/chunking out of the browser/request path for large institutional files. Current 15 MB browser extraction is not a durable processing architecture.
- Replace keyword-overlap retrieval over the most recent 200 chunks with a bounded, indexed retrieval strategy if context collections grow. Add tenant/document filtering and relevance evaluation.
- Add database indexes and query plans for the high-volume paths: session/event ordering, organization scope, research joins, assignment access, usage reports, audit timelines, and document chunks.
- Define export pagination/streaming and row-count limits. Current dataset assembly should be tested against institutional-scale sessions and multi-project exports.
- Consider a job/status model for generation, document processing, review synthesis, and exports if request duration becomes unreliable. The current UI progress bar is presentation around a synchronous request, not a job queue.
- Establish connection/pooling behavior and load tests for the serverless runtime and backend API.

## Reliability

- Add idempotency keys for scenario generation, document finalization, review generation, assignment creation, and turn submission. Retries can otherwise duplicate work or records at API boundaries.
- Add explicit stale-session/conflict recovery for concurrent tabs. The commit RPC has sequence protection, but the UX needs a deterministic reload/reconcile path.
- Add timeout budgets and cancellation propagation from the browser through the model gateway. Provider SSE may continue after a client disconnect without a job boundary.
- Verify all model identifiers and provider configurations, including the fallback `openai/gpt-5.6-sol` value in `modelAdapter.server.ts:30-38` and the active `turn_model` configuration.
- Add durable retry/replay controls for failed document processing and review generation, with audit history and bounded duplicate prevention.
- Define behavior for partially uploaded documents, orphaned storage files, deleted scenarios with active assignments, and deleted/disabled users.
- Make database migrations reproducible in CI/staging/production and add migration rollback/forward-recovery procedures. Current types are generated artifacts, not a migration verification process.
- Add backup/restore drills and verify that generated JSON fields, storage objects, model metadata, and research snapshots restore consistently.
- Test ending/closing behavior under model non-response, repeated non-movement, provider failure, browser refresh, and simultaneous scene changes. The current closing arc is prompt- and model-dependent.

## Accessibility

- Run automated WCAG 2.2 AA checks in CI on every route and key state: empty, loading, error, modal/drawer, validation failure, transcript, research tables, and export controls.
- Perform keyboard-only and screen-reader testing for AppShell navigation, Design Lab choice cards, document upload, drawers, transcript composer, flagging, scene changes, disclosures, and research tabs.
- Verify focus management when drawers/modals open and close; ensure focus is restored to the invoking control.
- Review live-region announcements for model loading, turn success/failure, scene changes, flags, and ending a rehearsal. Avoid double-announcing large transcript updates.
- Confirm contrast, text resizing, reduced-motion behavior, target sizes, error association, and table/data-dictionary semantics.
- Replace or wrap raw feature buttons/inputs with consistently accessible design-system components where the current AppShell class-string approach omits required behavior.
- Test long names, long model lines, large state labels, and narrow/mobile layouts for clipping or overlap.

## Model infrastructure

- Establish a supported-model registry with validated identifiers, provider capabilities, context/output limits, structured-output guarantees, and deprecation dates.
- Separate model configuration from model routing policy. Current configuration has a turn override, but no documented fallback/rollout/canary strategy is evident.
- Add provider health checks, circuit breakers, backpressure, distributed rate limits, and per-tenant cost controls.
- Make structured-output validation provider-aware and version the schemas/prompts used to derive scenarios, run turns, and synthesize reviews.
- Store enough non-sensitive prompt/version metadata to reproduce a result without logging student/context content. Current model metadata is useful but prompt template/version governance should be formalized.
- Evaluate generation, turn responsiveness, latent-information gating, scene continuity, student-count adherence, fixed-cast adherence, non-movement, and ending behavior with a golden test set.
- Add human review and rollback for model configuration changes. Existing activation and audit paths are not a full release/evaluation process.
- Define how provider outages affect the user: queue, retry, fallback, or fail closed. The current path returns an error and does not provide a deterministic local fallback.
- Measure end-to-end perceived latency separately from provider latency; current browser behavior waits for the server call and then refetches the full session.

## Data governance and privacy

- Obtain institutional/legal review for data processing, FERPA and applicable state privacy obligations, retention, deletion, data residency, subprocessors, and model-provider terms.
- Add explicit consent/notice and institutional controls for research collection, participant inclusion, pseudonymization, and withdrawal. Current research supports scoped access and pseudonyms but not consent/recruitment workflows.
- Implement and schedule the retention settings already present on `organizations`; include storage objects, chunks, events, reviews, usage logs, audit data, exports, and research snapshots.
- Implement account deletion, organization deletion, export deletion, and legal hold procedures. Existing audit action types include planned-looking deletion actions without a complete workflow.
- Add configurable redaction/PII detection before document upload, before model submission, and before research export. The current privacy reminder is guidance, not enforcement.
- Define data classification for draft specs, latent information, raw document text, model output, session events, feedback, research annotations, and audit metadata.
- Verify model-provider training/retention settings and ensure institutional data is not used for provider training without contractually approved terms.
- Add data lineage for every research field, including currently null/stubbed `group_id` and `assurance_run_count`, and prevent undocumented/unsupported fields from being exported.
- Document retention and deletion semantics for backups and generated artifacts.

## Observability

- Add request correlation IDs spanning browser action, server function, model attempt, database commit, and audit record.
- Add structured metrics for route/server-function latency, error rates, retry/repair counts, queue depth, document processing, storage failures, database conflicts, and export sizes.
- Improve model telemetry with provider response status, time-to-first-token, time-to-last-token, timeout category, rate-limit category, and configuration rollout identifiers while continuing to exclude prompts/content and secrets.
- Add alert thresholds and on-call ownership for auth failures, model outage, elevated repair rate, commit conflicts, storage failure, high latency, cost spikes, and export errors.
- Ensure audit writes are durable enough for institutional accountability. Current `writeAudit` logs an error and does not fail the user action when audit insertion fails.
- Add dashboards for tenant-level usage, retention backlog, failed processing, research exports, and security events; the current OperationsPanel is a useful read view but not an operational system.
- Define log retention, access controls, redaction tests, and incident export procedures.
- Monitor frontend errors and Core Web Vitals by release and route, not only root error-boundary reports.

## Testing and release quality

- Add unit tests for every schema semantic invariant: exact student count, unique names, fixed-cast voices, present-scene voices, scene transitions, closing state, latent reveal rules, and review shape.
- Add server-function integration tests against a disposable/staging backend for authorization, RLS, storage, RPC commits, organization isolation, research scopes, and feedback policies.
- Add browser end-to-end tests for sign-in, Design Lab build, document upload, derived scenario edit/autosave/publish, direct Test simulation, turn submission, scene changes, flags, ending, review, feedback, assignment, research dataset preview/export, and admin controls.
- Add accessibility tests and manual assistive-technology acceptance criteria.
- Add model contract tests using recorded/synthetic provider responses, invalid JSON, schema violations, timeouts, rate limits, retries, repair attempts, and provider outages.
- Add load/soak tests for concurrent turn submissions, document processing, research exports, and model configuration changes.
- Add migration smoke tests that create every public table with grants before RLS/policies and verify the generated types match the applied schema.
- Add visual regression tests for loading/error/empty states and transcript/read-of-room formatting.
- Add CI checks for lint, typecheck, tests, build, dependency vulnerabilities, forbidden server/client imports, secrets scanning, migration drift, and generated route/type artifacts.
- Establish release promotion, rollback, feature-flag, and database migration sequencing procedures.
