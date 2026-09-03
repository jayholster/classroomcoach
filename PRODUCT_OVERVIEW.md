# Classroom Coach — Product Overview

## Purpose

Classroom Coach is an authenticated web application for designing, practicing, and reviewing difficult teaching moments. An educator supplies a practice purpose, a teaching role, a setting, a configured number of students, optional other people in the situation, and optional context documents. The application derives a structured simulation, lets the practitioner rehearse the interaction with a model-generated room response, and produces a short after-action review from the recorded event log.

The current product is a prototype/early vertical slice rather than a complete institutional product. It is designed around educator governance: the educator reviews and edits the derived scenario before publishing it, and published versions preserve the cast, state, foundation version, and model metadata used to create them.

## Roles

Roles are represented in backend tables, not browser storage or profile fields. The current application uses the `admin`, `educator`, and `learner` values of the `app_role` enum (`supabase/migrations/20260902004741_dc6c270e-af65-40d8-825d-a40f6a9a975c.sql:3`; generated type at `src/integrations/supabase/types.ts:1884`). Organization memberships also carry a role.

| Role | Current capabilities | Evidence |
|---|---|---|
| Learner | Rehearse published simulations available through assignments; view their own rehearsal/review records subject to backend policies. | `SECURITY.md`; rehearsal/review functions and RLS migrations |
| Educator | Create and edit scenarios, upload context, derive and publish versions, start rehearsals, assign simulations to groups, review sessions, and leave instructor feedback. | `src/lib/api/scenarios.functions.ts`; `assignments.functions.ts`; `review.functions.ts` |
| Admin | Organization/model/operations visibility and administration, including model configuration activation, assurance checks, system health, usage, audit trail, and research project creation. | `src/lib/api/admin.functions.ts`; `operations.functions.ts`; `AssurancePanel.tsx` |
| Research-scoped user | Access to the research terminal only when granted a matching `research_scopes` record; can inspect scoped sessions, annotate, build datasets, and export according to scope. | `src/lib/api/research.functions.ts`; `src/lib/research/scope.server.ts` |

The visible navigation is role-filtered in `src/components/AppShell.tsx:10-29`, but authorization is enforced again by server functions, backend row policies, and organization/research scope helpers. The UI is not the security boundary.

## End-to-end workflows

### 1. Sign in

1. A visitor lands on `/` (`src/routes/index.tsx`).
2. The landing page routes signed-out users to `/auth` and signed-in users to `/library` based on `useAuth()`.
3. `/auth` supports email/password sign-in, email/password sign-up, and Google OAuth (`src/routes/auth.tsx:34-78`).
4. The authenticated route gate checks the current user before rendering protected routes (`src/routes/_authenticated/route.tsx:1-12`).
5. A database trigger creates a profile and default educator role on first account creation (`supabase/migrations/20260902004741_dc6c270e-af65-40d8-825d-a40f6a9a975c.sql`).

### 2. Build a simulation

1. From `/design`, the practitioner selects a preset or custom practice focus, one of four difficult moments, setting, practitioner role, one to three students, and optional non-student participants (`src/routes/_authenticated/design.index.tsx:30-48`).
2. The practitioner may add `.txt`, `.md`, `.docx`, or `.pdf` context documents.
3. The application creates a scenario record, creates document records, uploads files to private storage, extracts document text in the browser, chunks it, and marks documents ready or failed (`design.index.tsx`; `src/lib/api/documents.functions.ts`; `src/lib/documents/extractText.ts`).
4. A single Build Scenario action calls scenario creation and structured derivation. The UI displays staged progress while the generation request runs (`src/routes/_authenticated/design.index.tsx:57-175`, `:282-285`).
5. The server gathers foundation resources, People Library profiles, and relevant document chunks, then calls the model gateway and validates the result against `ScenarioSpecSchema` (`src/lib/api/generate.functions.ts`; `src/lib/ai/context.server.ts`; `src/lib/spec/schema.ts`).
6. The user is taken to `/design/:id` to inspect the derived simulation.

### 3. Review, edit, and publish

1. `/design/:id` loads the scenario and People Library profiles.
2. The practitioner can edit the purpose, cast, relationships, known/latent information, setting, and conditions. Person swaps are constrained by the People Library.
3. Changes are autosaved through a debounced call to `saveDraftSpec` (`src/routes/_authenticated/design.$id.tsx:47-95`).
4. The practitioner can re-derive, save, publish, or test the simulation.
5. Publishing validates the exact configured student count, unique names, and opening voices, then freezes a `scenario_versions` row and participant snapshot (`src/lib/api/scenarios.functions.ts:236-343`; `src/lib/spec/schema.ts:134-151`).

### 4. Start and continue a rehearsal

1. `/rehearse` lists published simulations and resumable sessions (`src/routes/_authenticated/rehearse.index.tsx:36-62`).
2. Starting a rehearsal creates a `rehearsal_sessions` record, an initial `simulation_states` record, and an opening `simulation_events` record (`src/lib/api/rehearsal.functions.ts:57-138`).
3. The Test simulation action from the design screen uses the same start path and opens the returned session directly (`src/routes/_authenticated/design.$id.tsx:146-172`).
4. `/rehearse/:id` displays the room transcript and a focused response composer. Each practitioner move is sent to the turn server function.
5. The server builds a compact prompt from the published specification, current state, and recent history; calls the model gateway; validates the structured response; and commits the event/state atomically through `commit_simulation_event` (`src/lib/api/rehearsal.functions.ts:203-344`; migration `20260902155316...sql`/`20260902155441...sql`).
6. The response renders named voices, cues, quoted dialogue, observations, scene markers, and a subtle room-direction/trajectory signal.
7. The practitioner can explicitly change scene, pull one student aside, flag an event, or end the rehearsal (`rehearse.$id.tsx:39-120`, `:300-390`). Cast membership remains fixed; scene changes alter who is present, not who exists in the published simulation.
8. Ending the rehearsal marks `ended_at` and routes to the review.

### 5. Review a rehearsal

1. `/review` lists in-progress and completed sessions (`src/routes/_authenticated/review.index.tsx`).
2. `/review/:sessionId` loads the persisted session/event log and displays a concise review-oriented view (`src/routes/_authenticated/review.$sessionId.tsx`).
3. The practitioner can generate an after-action review. The review model receives event evidence, not a re-run of the conversation, and returns a short summary plus three bounded sections: what moved things, where it stalled, and what to try next (`src/lib/api/review.functions.ts`; `src/lib/ai/prompts.server.ts`).
4. Full transcript and evidence are available behind disclosures. Flags and scene changes remain traceable to event records.
5. An educator/admin can add feedback to the session through the instructor feedback thread; the session owner can read it (`review.functions.ts:108-160`; `session_feedback` migration).

### 6. Assign a simulation

1. The Library can create or select an organization group and create an assignment tied to a published scenario version (`src/routes/_authenticated/library.tsx:39-55`, `:286-346`).
2. Assignment records store the group, version, owner, instructions, status, and optional open/close dates.
3. Current code provides group/assignment creation and closing. A complete invitation/member-management workflow is not present in the application functions audited.

### 7. Research dataset workflow

1. `/research` lists research workspaces and offers optional workspace creation; it is not a “start study” screen (`src/routes/_authenticated/research.index.tsx`).
2. `/research/:projectId` is a tabbed research terminal with overview, sessions, Dataset Builder, and Assurance views (`src/routes/_authenticated/research.$projectId.tsx`).
3. Research scopes resolve organization, group, scenario, and assignment permissions server-side.
4. Researchers can inspect event-level records, add annotations, choose documented fields, preview rows, save dataset definitions, create snapshots, export CSV/data dictionary output, and inspect export history (`src/lib/api/research.functions.ts`; `src/lib/research/fields.ts`; `src/lib/research/scope.server.ts`).
5. `/research/:projectId/session/:sessionId` is the Event Explorer. It separates observed learner actions from model-generated responses and keeps raw structured records behind disclosures (`src/routes/_authenticated/research.$projectId.session.$sessionId.tsx`).
6. Assurance is integrated into the research workspace rather than exposed as a separate primary module. It includes scenario/event checks, flagged moments, model configuration controls, and admin operations panels (`src/components/AssurancePanel.tsx`; `OperationsPanel.tsx`).

## Product boundaries visible in the current implementation

- The simulation cast is fixed when a version is published; scene changes select from that cast rather than creating new characters (`src/lib/spec/schema.ts:95-112`; `rehearsal.functions.ts:345-405`).
- Student count is constrained to one through three and validated on publication and generation.
- Learner-facing access to drafts and latent information is intended to be restricted by backend policy; the current research/admin paths are separate from learner paths.
- Context document text is used to derive scenario content, but retrieval is keyword-overlap based rather than embedding/vector based (`src/lib/ai/context.server.ts:78-82`).
- The current front end is a browser-rendered React experience using TanStack Start/Router and TanStack Query. It is not a native app or a separate API product.
