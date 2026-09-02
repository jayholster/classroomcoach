# Professional refresh + guided Design Lab + faster model

Three changes: a commercial-grade visual system, a Design Lab rebuilt around preset choosers, and a faster model for live rehearsal turns. No page or workflow is removed; the same routes and data layer stay in place.

## 1. Visual refresh (product-grade, not a redesign)

Locked direction: institutional navy + slate (`#0F172A`, `#1E3A5F`, `#64748B`, `#E2E8F0`), Sora for headings, Manrope for body.

- Retune the tokens in `src/styles.css` to that palette in oklch (light and dark), tighten border/muted contrast, and add a small elevation + focus-ring scale so panels read as software rather than a document.
- Load Sora and Manrope with a `<link>` in the root route head; register `--font-display` / `--font-sans` in `@theme`.
- Upgrade shared chrome in `AppShell.tsx`: denser header with product mark and role badge, pill-style primary nav with clear active state, consistent page-header block (title, one-line purpose, primary action on the right), refined `Section`, `Chip`, `Drawer`, buttons, and inputs.
- Apply the header/action pattern uniformly across Library, Design Lab, Rehearse, Review, and Research so pages stop looking hand-built one at a time.
- Keep every semantic token; no hardcoded colors in components.

## 2. Design Lab: choose, don't compose

The entry page becomes a short guided form where everything that can be a preset is a preset, all visible on one page (no Simple/Advanced split, nothing hidden behind an advanced view).

- **Practice focus** — card grid of preset practice situations (the existing example set, expanded and labeled), one click to select.
- **Who is practicing** — chooser (preservice teacher, student teacher, first-year teacher, early-career teacher).
- **Setting** — chooser from the existing settings list, with a "type your own" fallback chip since local settings vary.
- **Students in the room** — segmented control: 1, 2, or 3 (max 3 for now).
- **Difficult moment** — four preset cards to practice:
  1. Conflict between students that interrupts the lesson
  2. A public challenge to your decision
  3. Withdrawal / disengagement that others are noticing
  4. A boundary or safety expectation being repeatedly ignored
- **Anything specific** — one optional short note.
- **Local context documents** — kept, but as a compact optional strip at the bottom of the same page.
- "Try an example" stays and now fills every chooser, independently randomizing practice focus, setting, student count, and difficult moment.
- A one-line summary ("A preservice teacher practicing a public challenge with 2 students in a 7th-grade band rehearsal") sits above the Build button so the selection is legible before generating.

Selections are stored on the scenario and passed into generation so the model honors the student cap and the chosen difficult moment. The draft editor at `/design/$id` keeps its current structure and gains the refreshed styling.

## 3. Faster responses

Split the model by function, as chosen:

- **Live rehearsal turns** → `google/gemini-3.7-flash` with priority serving, the biggest latency win in the flow the learner actually waits on.
- **Scenario generation and review synthesis** → stay on `openai/gpt-5.6-sol` for quality.

Implemented as a per-function model override in the model configuration layer, so an admin can still change it from Assurance without a code edit.

## Technical notes

- `src/styles.css`: token retune, font tokens, elevation/focus scale; fonts via `<link>` in `src/routes/__root.tsx`.
- `src/components/AppShell.tsx`: header, nav, `PageHeader`, `Section`, button/input class constants.
- `src/routes/_authenticated/design.index.tsx`: rewritten as the guided chooser form; new preset constants for practice focus, roles, settings, student counts, and the four difficult moments.
- `src/lib/api/scenarios.functions.ts` + a migration adding `student_count` and `difficult_moment` columns to `scenarios` (with GRANTs unchanged on the existing table).
- `src/lib/ai/prompts.server.ts`: generation prompt honors the student cap (participants ≤ chosen count) and the selected difficult moment.
- `src/lib/ai/context.server.ts` / `gateway.server.ts`: resolve model per `functionType`, with `turn` routed to the fast model; migration adds the turn-model column to `model_configurations`.
