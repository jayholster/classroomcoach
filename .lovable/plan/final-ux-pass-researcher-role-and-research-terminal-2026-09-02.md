# Final UX Pass + Researcher Role and Research Terminal

Two bodies of work: (1) an interaction-design pass over the existing screens, and (2) a new
scoped researcher role with a dedicated Research workspace. No architectural rewrite —
existing tables, server functions, and the navy/white visual language stay.

## Part 1 — Educator workflow and progressive disclosure

Keep the spine: describe practice → add context → draft → review → test → publish → assign.

- **Design Lab entry**: unchanged layout, but only the practice question is required. Role,
  setting, and specifics collapse under "Add detail (optional)" with derived defaults
  suggested from foundation resources and uploaded context instead of re-asked.
- **Scenario review (`design/$id`)**: split the current single long form into
  **Simple view** (title, purpose, summary, participants list read-only with inline rename,
  what learners see first) and an **Advanced** toggle revealing participants detail,
  relationships, tensions, visible/latent information, timing, boundaries, permitted
  variation, provenance, and reflection settings. Advanced sections become collapsible
  cards, not one wall of fields.
- **Autosave**: debounced save of draft spec edits with a persistent "Saved / Saving /
  Retrying" status near the primary action, plus a session-scoped Undo for the last edit.
- **Inline editing** everywhere in review; no separate edit modes. Concise helper text under
  each group, inline validation messages, source chips on every derived element.
- **Upload**: keyboard-reachable file input with labelled drop zone, per-file status,
  live-region announcements, and removable entries.
- **Test and Publish**: one obvious primary action per screen; "Test rehearsal" from the
  draft without leaving the flow; publish opens a short confirm with version label.
- **Assign**: a lightweight assign dialog from Library/scenario (group, window, instructions)
  writing to the existing `assignments` table — closing the last step of the stated workflow.
- **Responsive**: single-column stacking below `lg`, sticky action bar on small screens.

## Part 2 — Role-specific refinement

- **Learner**: minimal shell — no Library/Design/Assurance nav, larger type, reduced
  chrome in rehearsal, single "Respond" affordance, review focused on moments rather than
  metrics.
- **Educator**: as above.
- **Administrator**: operations panel stays where it is; nav item labelled Admin.
- **Researcher**: new Research area (Part 4), and researchers do NOT get admin surfaces.

## Part 3 — Researcher role and scoped authorization (database)

- Add `researcher` to the `app_role` enum.
- New `research_projects` (study name, description, organization, collection settings,
  status) and `research_scopes` (grant a user access at organization / project / group /
  scenario level).
- New `research_participants` mapping (user, project) → stable pseudonymous ID, so exports
  never carry account identity by default.
- New `research_datasets` (saved definition: filters, selected fields, scope),
  `research_snapshots` (frozen dataset: definition + version metadata + row payload
  reference), and `research_annotations` (researcher/facilitator notes on events).
- Security-definer helpers `has_research_access(session_id)` / `can_read_project(project)`,
  used by new SELECT policies on `rehearsal_sessions`, `simulation_events`,
  `simulation_states`, `flags`, `after_action_reviews`, `assurance_runs`,
  `scenario_versions`, and `model_usage_events`. All grants issued per table.
- Server functions re-check scope before returning rows; RLS remains the floor.
- Every export/snapshot writes an `audit_events` row (researcher, project, scope,
  definition, format, timestamp).

## Part 4 — Research terminal (`/research`)

Nav section visible only with a researcher grant. Sections:

- **Overview** — project info plus aggregate counts (participants, sessions, completed,
  scenarios, versions, events, flags, repeat sessions). No decorative charts.
- **Sessions** — filter by project, group, scenario, version, assignment, date range,
  completion; pseudonymous IDs only.
- **Event explorer** — chronological reconstruction of a session with prior state, action,
  visible response, state update, resulting state, flag status, model/provider/config, and
  provenance. Three visually distinct bands: OBSERVED, MODEL-GENERATED, ANNOTATION.
- **Scenarios & versions**, **Flags**, **Assurance** — scoped read-only tables.
- **Datasets** — dataset builder: pick data families (Session, Scenario, Interaction, State,
  Provenance, Contestability, After-Action Review, Authoring, Technical, Assurance, optional
  study variables), filter rows, select and reorder variables, preview, save definition.
- **Exports** — CSV and JSON download, a generated data dictionary describing every field,
  explicit "Create snapshot" action, and an export history list from the audit log.

## Part 5 — Governance

- Field registry in code marking each exportable field as CORE OPERATIONAL or OPTIONAL
  RESEARCH; optional families only available when enabled in the project's collection
  settings.
- Project settings screen showing exactly which fields the study collects.
- No demographic capture. No compliance claims in copy — the wording describes
  configuration, pseudonymization, retention, access control, and export auditing.

## Technical notes

- New migration for the enum value, research tables, grants, helper functions, and policies;
  applied before the UI that depends on it.
- New `src/lib/api/research.functions.ts` (scoped reads, dataset preview, export, snapshot)
  and `src/lib/research/fields.ts` (field registry + data dictionary generator).
- Export generation happens server-side and returns a serializable payload the client turns
  into a download; large exports are paginated and capped.
- Autosave uses a debounced mutation against the existing draft-spec update function.
- Nav filtering extends the existing role-aware `NAV` list in `AppShell.tsx`.

## Suggested order

1. Migration (enum, research tables, RLS, grants)
2. Researcher server functions + scope checks
3. Research terminal UI (Overview → Sessions → Event explorer → Datasets/Exports)
4. Educator progressive disclosure + autosave + assign dialog
5. Learner/admin polish, responsive and accessibility sweep
