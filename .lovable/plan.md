# Design Lab options + immersive transcript formatting

Two changes: make the Design Lab setup more flexible (custom entries, more people in the room), and rework how the rehearsal transcript is presented so it reads like being in the space. No scenario or model content changes — only which choices are collected and how existing output is displayed.

## 1. Design Lab: add "Add your own" and open entry

- **Practice focus (step 1):** keep the four preset cards, add a fifth card "Add your own focus." Selecting it reveals a text field where the educator writes the focus in their own words; that text becomes the practice purpose.
- **Difficult moment (step 2):** same pattern — a fifth "Add your own moment" card with a text field describing the moment to practice.
- **Who is practicing / Setting (step 3):** change both from fixed dropdowns to combo inputs — the preset list stays available as suggestions, but the educator can type anything (e.g. "Second-year band director", "After-school robotics club").
- **Students in the situation:** unchanged — stays the clickable 1 / 2 / 3 buttons.
- **Others in the situation (new):** a multi-select row of clickable chips for non-student participants — Parent or guardian, Administrator, Another teacher, Paraprofessional or aide — plus an "Add your own" entry. Optional; none selected means students only.
- Custom text is required before building when an "Add your own" card is selected; the existing validation message covers it.
- The random example button keeps working and only picks from presets.

## 2. Immersive transcript formatting

The rehearsal response already arrives structured (each voice has a name, a delivery cue, and a line, plus a scene observation). Today they are flattened into one plain paragraph like `[Student, defensive]: "I said I'm doing it."` — the plan is to present those exact same pieces as distinct visual blocks:

- **Scene header at the top:** a quiet strip naming the setting and who is present, so the space is established before the first line.
- **Each voice as its own speech block:** speaker name on its own line in small caps, the delivery cue ("defensive, keeping their voice low") as an italic stage direction beneath it, and the spoken line larger with a left accent rule and generous line height so it reads as dialogue rather than data.
- **Observation as a separate scene beat:** set apart from the dialogue in a subtly tinted block with its own label ("In the room"), instead of an arrow prefix inline.
- **"What do you do next?" as a prompt divider** between the scene and the response box, not as trailing body text.
- **Your own turns** get a clearly distinct treatment (aligned and tinted differently from the room), so scanning the transcript shows the back-and-forth rhythm at a glance.
- **Recorded change** stays a quiet footnote under the beat, visually de-emphasized.
- Generous vertical spacing between turns so each exchange reads as a moment rather than a chat log.

Wording, dialogue, cues, and observations stay exactly as the simulation produces them.

## Technical notes

- `src/routes/_authenticated/design.index.tsx`: add custom-entry state for focus and moment, swap the two select fields for editable inputs backed by a `datalist`, add an "others in the situation" chip group, and fold the selections into the specifics string already sent to the scenario builder.
- `src/lib/api/scenarios.functions.ts` / `src/lib/ai/prompts.server.ts`: accept and pass through the non-student participants so generated scenarios can include them; student count validation (1–3) stays as-is.
- `src/routes/_authenticated/rehearse.$id.tsx`: render `visible_response.voices` and `.observation` as structured blocks instead of calling `renderVisibleResponse` for display. `renderVisibleResponse` stays in place for review/export paths so nothing downstream changes.
- Styling uses existing semantic tokens in `src/styles.css`; a small number of new tokens may be added for the speech-block accent.
- Chat latency is out of scope for this pass, as requested.
