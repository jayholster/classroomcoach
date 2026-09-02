# Fixed cast, explicit scene changes

Right now nothing guarantees the people in a rehearsal stay the same. The room's responses are generated turn by turn, and the only instruction about who exists is a list of participants in the prompt, so extra voices or drifting roles can appear mid-rehearsal. There is also no way to move the situation to a different scene once it starts.

This change makes the cast static and puts scene changes under your control.

## 1. The cast is locked

- Whoever you chose in the Design Lab — the students plus any parent, administrator, other teacher, or aide — becomes the fixed roster for that published version.
- During rehearsal only those named people can speak or act. No new names appear, nobody silently disappears, and the student count you set stays exactly what you set.
- A small "Who's in the room" strip sits above the transcript showing the current cast, so it is always visible what is fixed.

## 2. Scene changes are explicit

- A "Change the scene" control appears next to the response box during an active rehearsal.
- Choosing it opens a short form:
  - **Where/when now** — pick from a few presets (later the same day, hallway after class, next class period, a meeting after school, family conference) or write your own.
  - **Who is present** — checkboxes over the locked roster, so you can move to a scene with just one student, or bring in the parent/administrator you configured.
  - Optional one-line note about what happened in between.
- Confirming records a visible "Scene change" marker in the transcript, then the room opens the new scene with only the people you marked present.
- Between scene changes nothing about the cast shifts. Relationships, revealed information, and unresolved threads all carry across the scene change — only place, time, and who is present change.

## 3. Review and research reflect scenes

- The transcript, the after-action review, and the Event Explorer show scene-change markers so a rehearsal reads as a sequence of scenes rather than one undifferentiated stream.

## Technical notes

- `SimState` gains defaulted `scene` (`label`, `description`) and `present_participants` fields, so existing stored states keep parsing unchanged. No migration needed; state is JSONB.
- `simulation_events.kind` gains a `scene_change` value alongside `opening` and the normal turn kind. Recorded through the existing atomic `commit_simulation_turn` path, so sequence integrity and provenance are unchanged.
- `turnPrompt` in `src/lib/ai/prompts.server.ts` gains a hard roster constraint: the cast list is closed, only present participants may have voices, and no new named people may be introduced. Post-validation in `submitRehearsalTurn` drops or reassigns any voice whose name is not on the present roster before the turn is committed, so an off-roster response never reaches the transcript.
- `generationPrompt` already states the exact student count; validation after generation enforces it, rejecting and regenerating once if the returned participant list does not match the configured student count plus the configured non-student participants.
- New server function `changeScene` in `src/lib/api/rehearsal.functions.ts` (auth middleware, same org scoping and audit logging as existing turns) writes the scene-change event and the updated state, and asks the model for a short opening beat for the new scene using only the present cast.
- UI changes are confined to `src/routes/_authenticated/rehearse.$id.tsx` (cast strip, scene control, scene markers), with read-only scene rendering added to `review.$sessionId.tsx` and `research.$projectId.session.$sessionId.tsx`.
- No visual redesign, no new navigation, no schema tables.
