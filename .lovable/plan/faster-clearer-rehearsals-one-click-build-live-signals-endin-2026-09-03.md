# Faster, clearer rehearsals: one-click build, live signals, endings, and shorter reviews

This pass fixes two real bugs, speeds up the loop, and makes what the room is doing legible. No redesign, no new modules.

## 1. Build Scenario goes all the way through

Today "Build scenario" only creates the record; the Design Lab then opens on "No scenario has been derived yet" and you have to press "Derive scenario" yourself.

- Building now creates the simulation, uploads any context documents, and derives the scenario in one action.
- A visible progress panel replaces the dead wait: "Saving your setup" → "Reading your documents" → "Deriving the people, relationships, and opening moment", with an animated progress bar and elapsed time.
- If derivation fails you land in the Design Lab with the error and a "Try deriving again" button, exactly as today.

## 2. "Test simulation" actually opens a rehearsal

Confirmed bug: the button navigates to `/rehearse/<scenario id>` while that route expects a *session* id, so it always shows "This rehearsal is no longer available."

- The button now starts a real rehearsal session against the latest published version and opens it directly.
- If the simulation has no published version yet, the button explains that instead of navigating.

## 3. Faster responses

- Route rehearsal turns to a faster model tier and trim what each turn sends: the foundation text is summarized to the rules that matter mid-turn, and history is condensed rather than replayed verbatim.
- The composer stays responsive: your move appears in the transcript immediately with a "the room is reacting" pulse under it, so the wait is visible progress rather than a frozen page.

## 4. Subtle on-screen signals of direction

Each turn already records relationship changes, participation changes, revealed information, resolutions, and new unresolved threads — none of it shows during the rehearsal.

- A quiet "Read of the room" strip under each response shows small, professional markers:
  - improving (calm/positive tone), strained (warning tone), something revealed (accent tone), thread closed, new thread open.
- A single trajectory indicator near the scene header shows whether things are settling, holding, or escalating over the last few turns.
- No scores, no gamified awards, no praise language — just state made visible.

## 5. Pulling someone aside, and scenes that end

- The existing "Change the scene" control gets promoted next to the composer with a plain-language name and one-tap presets, including **Pull one student aside**, **Hallway after class**, **Later the same day**, and **Meeting after school**. Choosing a preset preselects who comes with you; the rest of the cast stays fixed and remembers everything.
- Rehearsals now have an arc. The room is instructed to move: a plausible de-escalation bid must produce visible movement (softening, resistance, deflection) rather than repetition, and repeated non-response is not allowed.
- After enough turns, or when the situation genuinely settles, the room plays a closing beat and the page offers "Close out this rehearsal and see your review."

## 6. Why Aisha and Ben went nowhere

Two causes in the current prompt, both fixed here:

- Nothing tells the room to *respond to the direction of your move*, so it can restate the conflict indefinitely. New rules require each turn to register your bid and shift stance in some direction, and to name the shift in the recorded state.
- Latent information is currently released only on a vague "interactional reason," and irrelevant items (Ben knowing who leaves early) can surface. Generation now requires each latent item to be tied to the practice focus and to the person's emotional stake, and the turn rules require a latent item to surface only when your move directly touches it — so pressing on Ben's anxiety opens Ben's anxiety, not trivia.

## 7. Shorter, better-looking review — plus instructor feedback

- The after-action review becomes brief and scannable: a one-paragraph "What happened" summary, then three short sections (What you did that moved things, Where it stalled, Try next) with at most three tight items each, every item tagged with the turn it came from.
- Long prose is capped; the full transcript and raw event evidence stay behind the existing disclosures.
- **Instructor feedback:** an assigning instructor opening a learner's review can leave written feedback on the rehearsal as a whole and on any individual turn. The learner sees it on their review page marked as instructor feedback with the author and date. Instructors see only rehearsals from their own courses/assignments.

## Technical notes

- `design.index.tsx` build handler chains `createScenario` → document upload → `generateStructuredScenario`, with staged progress state; `design.$id.tsx` "Test simulation" calls `startRehearsal` then navigates with the returned `sessionId`.
- Turn speed: set `turn_model` on the active model configuration to a faster Flash tier and shrink `turnPrompt` (condensed foundation + last 6 turns summarized).
- `prompts.server.ts`: turn rules gain responsiveness, trajectory, latent-relevance, and closing-beat requirements; `state_update` gains a `trajectory` value (`settling` | `holding` | `escalating`) and `closing` flag, both optional and defaulted so stored states keep parsing. `generationPrompt` constrains latent items to the practice focus.
- Rehearse UI renders signal chips from the existing `state_update` fields plus trajectory; scene presets extend `SCENE_PRESETS`.
- `reviewPrompt`/`ReviewSchema` gain a short `summary` and per-item turn references, with item counts capped; `review.$sessionId.tsx` re-renders accordingly.
- Instructor feedback: new `session_feedback` table (session, optional event, author, body, created_at) with GRANTs and RLS allowing the session owner to read and instructors of the session's course to read and write; server functions in a new `feedback.functions.ts`; UI in `review.$sessionId.tsx`.
