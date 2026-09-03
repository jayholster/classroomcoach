# Demo Mode — a self-playing tour at /demo

A public, no-login route that plays Classroom Coach to itself, end to end, so you can screen-record it without touching the app or spending model calls. Nothing about the real application changes.

## What it is

Open `http://localhost:8080/demo` (and the published `/demo`), press nothing, and the page plays a scripted ~2.5 minute walkthrough:

1. **Design Lab** — practice focus, difficult moment, student count, setting, and an added parent/guardian get chosen on screen with visible cursor movement and card selections.
2. **Building** — the staged progress bar runs through "Saving your setup", "Reading your documents", "Deriving the people, relationships, and opening moment".
3. **Review the derived scenario** — the cast, relationships, opening moment, and provenance appear in sequence.
4. **Rehearse** — the opening moment plays, then two or three educator moves type themselves out character by character, each followed by a simulated response, a "Read of the room" strip, and a trajectory chip. One beat includes pulling a student aside (a scene change).
5. **Close out** — the closing beat and the "Close out this rehearsal and see your review" prompt.
6. **Review** — the short summary, the three tagged sections, and an instructor feedback note.

Then it fades and restarts, so a long recording gives you multiple clean takes.

A small caption bar sits at the lower edge naming what's happening ("Choosing what to practice", "Adding local context", "The room responds", "What changed, and what to try next"). Captions are part of the recording, styled to match the product — thin border, navy on light gray, no marketing tone.

Fully automatic: it plays start to finish on load with no visible controls. The Classroom Coach header/nav, environment banner, and any buttons are not rendered on this route, so the recording frame is only the product surface.

## Content

All scenario, dialogue, review, and feedback text is written into a single script file — no AI calls, no database reads, no auth. That makes it deterministic (identical every take), instant, and free to run. The content is written to be representative of what the product actually produces, using the real scenario/turn shapes.

One scenario is scripted: a middle-grades classroom moment with two students and a parent present, chosen because it reads clearly to non-education audiences too.

## Technical notes

- New public route `src/routes/demo.tsx` with its own `head()` metadata, not under `_authenticated`, and not linked from app navigation.
- A `src/lib/demo/script.ts` module holding the timed step list: each step has a phase, duration, caption, and payload typed against the existing `ScenarioSpec` / `StateUpdate` / review shapes in `src/lib/spec/schema.ts`, so the demo can never drift from the real data model.
- A single `useDemoPlayer` hook advancing through steps on timers, with typing animation and a reduced-motion fallback (instant transitions when the OS prefers reduced motion).
- Presentation reuses the existing design tokens and the same visual blocks as Design Lab, Rehearse, and Review, rendered as demo-only presentational components under `src/components/demo/` — the real route files are not modified, so there is no risk to the working app.
- Fixed 16:9 stage area centered in the viewport so the recording crops cleanly.

## Out of scope

- No changes to Design Lab, Rehearse, Review, Research, Assurance, the database, or any server function.
- No video export or recording built into the app — you record the screen.
- No seeded demo account (can be added later if you want a live-clickable version).
