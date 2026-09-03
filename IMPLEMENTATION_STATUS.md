# Classroom Coach — Implementation Status

Status reflects the current source tree and migrations only. “Working” means an implemented application path exists; it does not mean production-scale validation is complete.

## Status legend

- **Working** — implemented end-to-end in the current application path.
- **Partial** — a meaningful path exists but has known limitations, inconsistent coverage, or incomplete surrounding workflows.
- **Mocked** — behavior is locally fabricated or placeholder-driven rather than backed by the intended service.
- **Not Implemented** — no current application path was found.

## Product and user access

| Feature | Status | Current evidence / location |
|---|---|---|
| Public landing page | Working | `src/routes/index.tsx` |
| Email/password sign-in | Working | `src/routes/auth.tsx:34-61` |
| Email/password sign-up | Working | `src/routes/auth.tsx:61-68` |
| Google OAuth entry point | Working, configuration-dependent | `src/routes/auth.tsx:70-78`; provider must be configured in the backend |
| Authenticated route gate | Working | `src/routes/_authenticated/route.tsx:6-10` |
| Auth session hook | Working | `src/hooks/useAuth.ts` |
| Profile creation on first account | Working | `handle_new_user` trigger in `20260902004741...sql` |
| Browser-side role-aware navigation | Working | `src/components/AppShell.tsx:10-29` |
| Server/RLS role enforcement | Working, requires deployment-policy validation | `src/lib/server/orgContext.server.ts`; migrations and function middleware |
| Anonymous access to application features | Not Implemented / intentionally unavailable | Protected route and server-function middleware design |

## Authoring and simulation library

| Feature | Status | Current evidence / location |
|---|---|---|
| Scenario Library list | Working | `src/routes/_authenticated/library.tsx:39-145`; `listScenarios` |
| Library search and status filters | Working | `library.tsx:145-225` |
| Scenario creation | Working | `src/lib/api/scenarios.functions.ts:58-109` |
| Scenario update/autosave | Working | `scenarios.functions.ts:159-207`; `design.$id.tsx:79-95` |
| Soft archive/delete scenario | Working | `scenarios.functions.ts:209-235` |
| Guided Design Lab setup | Working | `src/routes/_authenticated/design.index.tsx:30-175` |
| Preset difficult moments | Working | `design.index.tsx:42-47`; schema IDs at `src/lib/spec/schema.ts:40-45` |
| Custom practice focus/moment | Working | `design.index.tsx:30-48` |
| One-to-three student selection | Working and schema-validated | `design.index.tsx:47`; `schema.ts:49-51, 134-141` |
| Optional non-student participants | Working | `design.index.tsx:48`; scenario input/generation path |
| Random “Try an example” entry | Working | `design.index.tsx` example handler/constants |
| People Library profiles | Working for authenticated reads | `scenarios.functions.ts:344-351`; `context.server.ts` |
| Foundation resources display | Working | `src/components/FoundationPanel.tsx`; `foundation_resources` |
| Scenario derivation | Working, model/configuration-dependent | `generate.functions.ts`; `gateway.server.ts`; `ScenarioSpecSchema` |
| One-click Build Scenario through derivation | Working | `design.index.tsx:57-175`, including staged progress |
| Derived scenario review/edit screen | Working | `src/routes/_authenticated/design.$id.tsx` |
| Publish immutable version | Working | `scenarios.functions.ts:236-343`; `scenario_versions` and `scenario_participants` |
| Source/provenance display and validation | Partial | Schema and UI support provenance; `source_references` database field is not populated by audited function paths |
| Sample scenarios seeded for first screen | Not Implemented / not evidenced | `scenarios.is_sample` exists in generated schema but current app code does not set/read it |
| Local deterministic demo engine | Not Implemented in current source scan | No current `runSimulationTurn`/deterministic engine implementation was found under `src/` |

## Documents and context

| Feature | Status | Current evidence / location |
|---|---|---|
| Document record creation | Working | `src/lib/api/documents.functions.ts:52` |
| Private storage upload path | Working, storage policy/configuration-dependent | `design.index.tsx`; bucket name from `env.server.ts` |
| Supported text/Markdown extraction | Working in browser | `src/lib/documents/extractText.ts` |
| DOCX extraction | Working in browser | Mammoth browser import in `extractText.ts` |
| PDF extraction | Working in browser | `unpdf` path in `extractText.ts` |
| Document status/failure reporting | Working | `documents.functions.ts:89-151` |
| Document chunking | Working | `documents.functions.ts`; approximately 1,200-character paragraph chunks |
| Server-side extraction | Not Implemented | No server-side extractor exists in current source |
| Embedding/vector retrieval | Not Implemented | Retrieval is keyword-overlap over recent chunks in `context.server.ts:78-82` |
| Content hashing | Partial / effectively unused | `content_hash` appears in generated schema, but audited application code does not populate it |

## Rehearsal engine

| Feature | Status | Current evidence / location |
|---|---|---|
| Published simulation selection | Working | `rehearse.index.tsx`; `listPublishedScenarios` |
| Start new rehearsal | Working | `rehearsal.functions.ts:57-138` |
| Direct Test simulation navigation | Working | `design.$id.tsx:146-172` |
| Resume in-progress session | Working | `rehearse.index.tsx:84-103`; session loader |
| Structured model turn | Working, model/configuration-dependent | `rehearsal.functions.tsx:203-344`; `TurnOutputSchema` |
| Atomic event/state commit | Working, requires database RPC deployment | `commit_simulation_event`; `rehearsal.functions.tsx:302-304` |
| Fixed published cast | Working | `schema.ts:95-112`; publication snapshot and turn validation |
| Explicit scene change | Working | `rehearsal.functions.ts:345-405`; `kind: "scene_change"` |
| Pull-one-student-aside scene preset | Working | `SCENE_PRESETS` in `schema.ts` and Rehearse scene control |
| Present-participant validation | Working | `validateTurnOutput` in `schema.ts` |
| Room direction/trajectory signal | Working | `StateUpdateSchema`, `ReadOfTheRoom`, rehearsal UI |
| Closing beat/end rehearsal | Partial | Prompt/UI/database end path exists; model behavior is probabilistic and needs outcome testing |
| Streaming response to browser | Partial | Provider adapters use SSE internally, but the route submits a turn and refetches the completed session; no end-user incremental token stream is exposed |
| Optimistic turn rendering | Not Implemented | Rehearse refetches after the server call rather than rendering an optimistic response |
| Local fallback when model unavailable | Not Implemented in current path | Errors are returned; no current deterministic fallback was found |
| Event flagging | Working | `flagEvent` and Rehearse flag UI |
| Rehearsal content export | Not Implemented as a user feature | Research export is separate |
| Legacy `commit_simulation_turn` RPC usage | Not Implemented / dead path | Present in migrations/types but not called by current app code |

## Review and feedback

| Feature | Status | Current evidence / location |
|---|---|---|
| Review session list | Working | `src/routes/_authenticated/review.index.tsx` |
| Review detail from persisted event log | Working | `review.$sessionId.tsx` |
| Structured after-action synthesis | Working, model/configuration-dependent | `review.functions.ts:10-107`; `ReviewSchema` |
| Brief formatted review | Working | `review.$sessionId.tsx`; prompt limits to summary and three sections |
| Transcript evidence disclosure | Working | `review.$sessionId.tsx` |
| Instructor feedback thread | Working | `review.functions.ts:108-160`; `session_feedback` table and migration |
| Feedback moderation/versioning | Not Implemented | Current feedback path is append/read/update/delete under policies; no moderation workflow found |
| Rubric/score-based grading | Not Implemented | No rubric or grading table/function found |
| Feedback notifications | Not Implemented | No notification/email/in-app notification path found |

## Assignment and organization workflows

| Feature | Status | Current evidence / location |
|---|---|---|
| Organization membership model | Working in schema/policies | `organizations`, `organization_memberships`, org context helpers |
| Group listing/creation | Working | `assignments.functions.ts:26-74` |
| Assignment creation | Working | `assignments.functions.ts:75-181` |
| Assignment close | Working | `assignments.functions.ts:182-207` |
| Group member invitation/acceptance UI/API | Not Implemented in audited app functions | Tables exist, but no corresponding current function path was found |
| Learner assignment dashboard | Partial | Assignment-linked access is represented; a dedicated learner-facing assignment management screen was not found |
| Assignment scheduling enforcement | Partial / schema-backed | `opens_at`/`closes_at` fields exist; full runtime policy/enforcement should be verified |

## Research terminal

| Feature | Status | Current evidence / location |
|---|---|---|
| Research workspace list | Working | `research.index.tsx`; `listResearchProjects` |
| Optional research workspace creation | Working for authorized users | `research.index.tsx`; `createResearchProject` |
| Research scope resolution | Working, needs policy integration testing | `src/lib/research/scope.server.ts` |
| Project overview | Working | `research.functions.ts:48-94` |
| Scoped session/event explorer | Working | `research.functions.ts:95-208`; research session route |
| Research annotations | Working | `research.functions.ts:209-225`; `research_annotations` |
| Dataset field registry | Working | `src/lib/research/fields.ts` |
| Dataset preview | Working | `research.functions.ts:226-279` |
| Dataset definition save | Working | `research.functions.ts:280-301` |
| Dataset snapshot | Working | `research.functions.ts:338-376` |
| CSV/data dictionary export | Working, subject to scope and field limitations | `fields.ts`; `research.functions.ts:302-337` |
| Export history | Working | `research.functions.ts:377-396` |
| Pseudonymization | Working | `scope.server.ts:ensurePseudonyms` |
| Populated research group_id output field | Partial / stubbed | `scope.server.ts:322` hardcodes `null` |
| Populated assurance_run_count output field | Partial / stubbed | `scope.server.ts:362` hardcodes `null` |
| Assurance integrated into Research workspace | Working | `research.$projectId.tsx`; `AssurancePanel.tsx` |
| Persisted assurance runs | Not Implemented in current application path | `assurance_runs` table exists; current assurance check path computes in memory |
| Study recruitment/consent/randomization | Not Implemented | No workflow found |
| Research participant management UI | Not Implemented | Pseudonym mapping exists; recruitment/consent workflow does not |

## Assurance, operations, and observability

| Feature | Status | Current evidence / location |
|---|---|---|
| Active model configuration read | Working | `context.server.ts`; `model_configurations` |
| Admin model configuration activation | Working | `admin.functions.ts:44-89` |
| Assurance checks | Partial | `admin.functions.ts:159-270` performs in-memory checks; persisted assurance run records are not written |
| System health view | Working | `operations.functions.ts:37-113`; `OperationsPanel.tsx` |
| 24-hour model reliability summary | Working | `operations.functions.ts`; `OperationsPanel.tsx` |
| Usage-over-time summary | Working | `operations.functions.ts:140+` |
| Audit writes | Working but failure is non-blocking | `src/lib/server/audit.server.ts` |
| Structured operational JSON logs | Working | `src/lib/server/logger.server.ts` |
| Prompt/content redaction from logs | Working by implementation intent | logger comments and gateway fields; should be regression-tested |
| Error reporting to external Lovable reporting path | Working | `src/lib/lovable-error-reporting.ts`; root error component |
| Retention policy enforcement | Not Implemented in audited source | Organization retention columns exist, but no cleanup job/enforcement path was found |
| Usage limit enforcement | Not Implemented in audited source | Organization usage-limit columns exist, but no limit gate was found |

## Design, accessibility, and maintainability

| Feature | Status | Current evidence / location |
|---|---|---|
| Responsive visual design | Partial | Tailwind responsive classes exist; complete device/accessibility coverage is not established |
| Semantic route metadata | Working | Leaf route `head()` functions plus root metadata |
| Keyboard/accessibility basics | Partial | Skip-link, labels, live regions, and disclosures exist; no automated accessibility suite found |
| Shared design tokens | Working | `src/styles.css` semantic oklch tokens |
| Shared component system consistency | Partial | Feature screens use AppShell class strings while a broad UI component scaffold is mostly unused |
| Automated schema tests | Working | `src/lib/spec/schema.test.ts` |
| Full end-to-end automated test suite | Not Implemented | No browser test suite is present in the repository |

## Overall assessment

The strongest working vertical slice is: authenticated educator → Design Lab inputs → optional document context → model-derived structured scenario → review/edit/autosave → publish → start/test rehearsal → persisted structured turns → end → concise review → instructor feedback. The largest partial areas are institutional assignment/member workflows, real-time browser streaming, research data completeness, persistent assurance history, retention/usage enforcement, and automated end-to-end/accessibility coverage.
