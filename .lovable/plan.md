# Classroom Coach — Web Prototype

A clickable, working prototype that wraps the existing Classroom Coach simulation foundation in an educator-facing authoring, rehearsal, and review environment. Everything runs locally (localStorage), demonstrable with no API key.

## Visual direction

Deep navy, white, warm light gray, restrained light-blue accent. Simple sans-serif, generous whitespace, thin 1px borders, near-flat surfaces, small radii. No gradients, glows, sparkles, robot/brain imagery, or marketing language.

Shell: wordmark "Classroom Coach" + subtitle "Configurable professional rehearsal", nav (Library, Design Lab, Rehearse, Review, Assurance), and a role switcher (Designer/Educator, Learner, Admin/Research) in the header.

## Seeded foundation content

From the uploaded documents, seeded as read-only system resources:

1. Core Simulation Instructions — begin mid-action, 3 student voices, bracketed emotional tags, one ripple line, "What do you do next?", 98% verbal / 2% environmental, no tidy outcomes, no correct answer.
2. People Library — 10 representative profiles (Aisha, Ben, Clara, Ella, Finn, Grace, Mia, Kayla, and others present in the source), with grade-specific detail, friendships, rivalries, interests, and SES/background context preserved as written.
3. Scenario Dynamics — minute-by-minute progression rules.
4. Interaction Boundaries — dos and don'ts.
5. Relational Consequences — good/bad outcome patterns, cumulative effects, reflection lens.

Foundation panel in Design Lab shows the five resources with "Active" status and a short explanation; full prompt text is never exposed in the ordinary interface.

## Screens

**Library** — header, one-line description, `+ Create Simulation`, and the three seeded simulations (Middle School Ensemble v2, Engineering Design Camp v1, First-Year Teacher v3) with status chips (Draft / Published / Needs Review) and Edit / Duplicate / Preview / Assign actions. Duplicate creates an editable copy, original retained.

**Design Lab — Start** — one large question, "What should someone practice?", then Who is practicing, Setting, and an optional "anything specific". Local Context upload: real drag-and-drop plus file picker, TXT read directly and DOCX extracted in-browser with Mammoth, removable file list persisting for the authoring session. Uploads are optional. `BUILD SCENARIO DRAFT`.

**Design Lab — Review the simulation Classroom Coach built** — structured, editable draft:
- Purpose (practice goal, practicing role)
- Setting
- Simulated People: suggested from the People Library, clickable detail drawer (relevant tendencies, relationships, known tensions, relevant interests, what they know, what is hidden from the teacher), SWAP PERSON opens the People Library picker. Participant type supports Student / Parent / Colleague / Administrator / Community member.
- Relationships & Tensions: editable situational pairs (e.g. Mia ↔ Kayla, High), plus Add situational relationship. Edits are situational only; underlying profiles unchanged.
- Visible at Start / Latent: items movable between lists, addable, removable, with the short explanation of latent information.
- Simulation Conditions: starting moment, difficulty tags (add/remove), interaction intensity, pacing, three relational toggles, reflection focus tags, and derived editable boundary statements.
- Provenance: small "Derived from" chips (People Library, Scenario Dynamics, uploaded filenames) and a "Why is this here?" control giving a factual, resource-grounded reason only — no chain-of-thought, no psychological speculation.
- Footer: SAVE DRAFT / TEST SIMULATION / PUBLISH VERSION. Publishing records version, creator, date, foundation version, and local context files.

**Rehearse** — text-based, learner-facing only. Header "7th Grade Band — Rehearsal", "You are the ensemble director.", scripted opening in Classroom Coach format, free-text response field (no multiple choice), short consequential turns. Flag icon on each system turn with reason list; simulation continues after flagging. Instructor-only "Current simulation state" drawer showing unresolved events, revealed/latent information, participation changes, and relationship changes in plain language — no scores or meters. Reset available.

**Review (After-Action)** — timeline of opening, user actions, student responses, state changes, and flags. Selecting a moment shows BEFORE / YOUR ACTION / WHAT HAPPENED / WHAT CHANGED. Brief Strengths Observed, Growth Opportunities, Possible Next Rehearsal in the relational, non-graded Classroom Coach voice.

**Assurance** — per published simulation, `Run checks` across Continuity, Hidden-information boundaries, Scenario facts, Unsupported/stereotyped inference, Required provenance, Core workflow. Results are Pass / Needs Review; clicking shows the scenario condition checked. No percentages or safety scores.

## Technical approach

- TanStack Start routes: `/` (Library), `/design`, `/design/$id`, `/rehearse`, `/rehearse/$id`, `/review`, `/assurance`.
- Design tokens (navy/gray/light-blue, radii, borders) defined in `src/styles.css`; no hardcoded color utilities.
- `src/lib/foundation/*` — seeded people library, foundation resource metadata, derivation rules.
- `src/lib/store.ts` — localStorage-backed simulations, versions, sessions, flags; role state.
- `src/lib/simulation/runSimulationTurn.ts` — single service abstraction. If an LLM is configured it sends system instructions, profile/context excerpts, published spec, explicit state, history, and the new user action, returning visible text plus a structured state update. With no model configured it falls back automatically to a deterministic demo engine that classifies input broadly (supportive/inquisitive, blaming/controlling, redirecting/neutral) and advances distinct consequential turns while mutating the same state object. Internal labels never surface to the learner.
- `mammoth` added for browser DOCX extraction.
- Per-route head() metadata with unique titles and descriptions.

## Out of scope for v1

No backend, no accounts, no real assignment delivery, no import of all 62 profiles, no permission enforcement beyond the demonstration role switcher.
