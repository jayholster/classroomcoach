# Finish the UX Pass and Research Terminal

You are right: the last phase only delivered the invisible half. The research data layer, permissions, and export logic are in place, but no interface changes shipped — there is no Research tab, no Simple/Advanced views, no autosave, and no assignment step. Everything below is UI work on top of what already exists.

## What is actually done

- Research database layer: projects, scopes, pseudonymous participant IDs, datasets, snapshots, annotations, with read-only scoped access rules.
- Research server functions and dataset/CSV/data-dictionary logic.
- `getMe` already returns `organizationRole`, `isOrgAdmin`, and `hasResearchAccess`.

## What is missing (this plan)

### 1. Research navigation
Add a "Research" tab to the main navigation, shown only when the signed-in user has a research grant. Learners and ordinary educators never see it.

### 2. Research Terminal at `/research`
- **Overview**: projects the user can access, scope description, counts of scenarios/rehearsals/events in scope.
- **Sessions**: filterable list of rehearsals in scope, showing pseudonymous participant IDs instead of names or emails.
- **Event Explorer**: one rehearsal expanded turn by turn, clearly separating what the learner did, what the simulation generated, and researcher annotations. Add/edit annotations inline.
- **Dataset Builder**: pick field families (core vs optional), preview rows, export CSV, and download the matching data dictionary. Each export is recorded in the audit trail.

### 3. Design Lab progressive disclosure
Split the scenario review screen into:
- **Simple view** (default): purpose, setting, people, and the few decisions most educators change.
- **Advanced view**: latent information, relationship tensions, provenance, source references, and version details.
A single toggle switches views and remembers the choice per user. No content is removed — only deferred.

### 4. Autosave
Replace manual save behavior in the Design Lab with debounced autosave plus a quiet status line ("Saving…", "Saved", "Couldn't save — retry"), so editors never lose work.

### 5. Assignment step
An explicit "Assign" action on a published simulation: choose a group, add instructions, set optional open/close dates. Learners then see only assigned rehearsals. This uses the assignments table that already exists but currently has no interface.

### 6. Role-specific shell
Learners get a minimal shell (Rehearse and Review only). Researchers see Research and Review. Educators and admins keep the full navigation.

## Technical notes

- New routes: `_authenticated/research.index.tsx`, `research.$projectId.tsx`, `research.session.$sessionId.tsx`, plus an assignment surface reachable from the library.
- Wire the existing functions in `src/lib/api/research.functions.ts`; no new research server logic is expected beyond small additions for annotations and project listing.
- Assignments need a small server function module (create, list, close) with organization checks, mirroring the existing scenario functions.
- Autosave calls the existing scenario draft update function with a debounce; no schema change.
- Keep the current visual language: same panels, typography, and navy palette. No redesign.

## Order of work

1. Research tab + Research Terminal (Overview, Sessions, Event Explorer, Dataset Builder).
2. Design Lab Simple/Advanced + autosave.
3. Assignment step and role-specific shell.
