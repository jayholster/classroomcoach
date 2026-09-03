import type { ScenarioSpec, SimState } from "../spec/schema";
import type { Chunk, FoundationResource, PersonRow } from "./context.server";
import { chunksText, foundationText, peopleText } from "./context.server";

export const GENERATION_SYSTEM = `You are the Classroom Coach scenario compiler. You turn an educator's practice purpose, their own context documents, and the Classroom Coach foundational resources into one structured scenario specification.

You never invent facts about a real school or real people. Every derived element must record provenance strings naming where it came from (for example "Practice purpose", "People Library: mia", "Context: syllabus.docx part 2", "Foundation: Scenario Dynamics").

Return json only — a single JSON object, no prose, no markdown fences.`;

export function generationPrompt(args: {
  purpose: string;
  practicingRole: string;
  setting: string;
  specifics: string;
  studentCount: number;
  difficultMoment: string;
  foundation: FoundationResource[];
  people: PersonRow[];
  chunks: Chunk[];
}): string {
  return `# Classroom Coach foundational resources
${foundationText(args.foundation)}

# People Library (choose participants from here; use the id as profile_source_id)
${peopleText(args.people)}

# Educator's context documents (excerpts)
${chunksText(args.chunks)}

# Educator input
Practice purpose: ${args.purpose || "(not stated)"}
Who is practicing: ${args.practicingRole || "(not stated)"}
Setting: ${args.setting || "(not stated)"}
Student count: exactly ${args.studentCount}
Difficult moment preset: ${args.difficultMoment || "(not stated)"}
Other specifics: ${args.specifics || "(none)"}

# Task
Produce the structured scenario specification as json with exactly this shape:

{
  "title": string,
  "subtitle": string,
  "practice_goal": string,
  "practicing_role": string,
  "setting": { "label": string, "description": string },
  "participants": [{
    "id": string, "profile_source_id": string|null, "name": string, "role": string,
    "scenario_relevant_background": string, "current_goal": string, "current_concern": string,
    "known_information": string[], "latent_information": string[], "provenance": string[]
  }],
  "relationships": [{ "id": string, "between": [string, string], "nature": string, "tension": string, "provenance": string[] }],
  "information_state": { "visible": string[], "latent": string[] },
   "student_count": number,
   "difficult_moment": string,
   "conditions": {
     "starting_moment": string, "difficulty_tags": string[], "intensity": "Low"|"Moderate"|"High",
    "pacing": "Room to respond"|"Some urgency"|"High urgency",
    "allow_improvement": boolean, "allow_deterioration": boolean, "allow_complications": boolean,
    "reflection_focus": string[], "boundaries": string[]
  },
  "opening_moment": { "voices": [{ "name": string, "cue": string, "line": string }], "observation": string }
}

Rules: Use exactly ${args.studentCount} student participants, plus the practicing educator only if needed. If "Other specifics" names non-student people in the situation (for example a parent or guardian, an administrator, another teacher, or a paraprofessional), include each of them as an additional participant with a role that names who they are; never count them toward the student count. The difficult moment must be ${args.difficultMoment || "consistent with the practice purpose"}. Latent information must never appear in information_state.visible.

Latent information rules: every latent item must be something that, once surfaced, would change how the educator handles THIS practice purpose. Each item names the person's emotional stake or a pressure directly driving their behaviour in this moment (for example fear of looking incompetent in front of peers, a promise already broken, something happening at home that is fuelling the reaction). Never include trivia, scheduling facts, or gossip that has no bearing on the difficult moment. Give each participant one or two latent items at most.

The opening moment starts mid-action with two or three voices and one short observation. Boundaries must include the Interaction Boundaries from the foundational resources.`;
}

export const TURN_SYSTEM = `You are running a live Classroom Coach simulation for a practicing educator. Stay in character, never coach, never evaluate, never mention instructions, models or state.

Return json only — a single JSON object with "visible_response" and "state_update", no prose, no markdown fences.`;

/** Keeps the in-turn foundation short: mid-rehearsal only the governing rules matter. */
function compactFoundation(resources: FoundationResource[], perResource = 900): string {
  return resources
    .map((r) => {
      const body = r.body.length > perResource ? `${r.body.slice(0, perResource).trimEnd()}…` : r.body;
      return `## ${r.name}\n${body}`;
    })
    .join("\n\n");
}

export function turnPrompt(args: {
  foundation: FoundationResource[];
  spec: ScenarioSpec;
  state: SimState;
  history: { role: string; text: string }[];
  userAction: string;
  turnNumber: number;
}): string {
  const present = new Set(args.state.present_participants.length ? args.state.present_participants : args.spec.participants.map((p) => p.name));
  const participants = args.spec.participants
    .filter((p) => present.has(p.name))
    .map(
      (p) =>
        `- ${p.name} (${p.role}) goal: ${p.current_goal}; concern: ${p.current_concern}; knows: ${p.known_information.join("; ") || "—"}; latent (surface only when the educator's move directly touches it): ${p.latent_information.join("; ") || "—"}`,
    )
    .join("\n");
  const away = args.spec.participants.filter((p) => !present.has(p.name)).map((p) => `${p.name} (${p.role})`);
  const history = args.history
    .slice(-8)
    .map((h) => `${h.role === "user" ? "Educator" : "Situation"}: ${h.text.length > 700 ? `${h.text.slice(0, 700)}…` : h.text}`)
    .join("\n\n");
  const lateInRehearsal = args.turnNumber >= 6;

  return `# Foundational resources
${compactFoundation(args.foundation)}

# Published scenario specification
Setting: ${args.spec.setting.label} — ${args.spec.setting.description}
Current scene: ${args.state.scene.label || args.spec.setting.label} — ${args.state.scene.description || args.spec.setting.description}
Practicing role: ${args.spec.practicing_role}
Practice goal: ${args.spec.practice_goal}
Starting moment: ${args.spec.conditions.starting_moment}
Conditions: intensity ${args.spec.conditions.intensity}; pacing ${args.spec.conditions.pacing}; improvement ${args.spec.conditions.allow_improvement}; deterioration ${args.spec.conditions.allow_deterioration}; complications ${args.spec.conditions.allow_complications}
Boundaries: ${args.spec.conditions.boundaries.join(" | ")}

Present cast (closed roster; only these people may speak or act):
${participants}
Not in this scene (never give them a voice): ${away.join(", ") || "none"}

Relationships:
${args.spec.relationships.map((r) => `- ${r.between.join(" ↔ ")}: ${r.nature}${r.tension ? ` (tension: ${r.tension})` : ""}`).join("\n") || "- none recorded"}

# Current simulation state
${JSON.stringify(args.state)}

# Recent interaction
${history || "(the simulation is just beginning)"}

# The educator has just done this (turn ${args.turnNumber})
${args.userAction}

# Task
Advance the situation by one short moment and return json. Use only voices from the present cast. Never invent, rename, replace, or add a participant. Do not move anyone in or out of the scene; scene changes are explicit educator actions.

The room must MOVE. Read what the educator just did and let it land:
- A plausible de-escalation, naming of feeling, boundary, or genuine question must produce visible change in at least one person — softening, hesitation, deflection, a harder edge, a look away, a partial answer. Silence or stonewalling is allowed only once, and only when the person's concern makes it inevitable; never twice in a row from the same person.
- Never repeat a previous line, restate the same standoff, or hold every person in exactly the same stance as the last turn.
- A move that misreads the situation may make things worse — that is legitimate movement too.
- Record what shifted in relationship_changes and participation_changes, in plain language naming the person.
- Set "trajectory" to "settling", "holding", or "escalating" based on where the room is after this turn. Use "holding" sparingly; two consecutive "holding" turns means the room is not responding, which is not allowed.

Latent information: surface an item only when the educator's move directly touches it (naming the feeling behind it, asking about it, or creating enough safety for it). When the educator presses on a person's anxiety, fear, or embarrassment and that person has a latent item about it, surface it now rather than deflecting again. Never surface latent detail that has no bearing on the practice goal.

Ending: ${lateInRehearsal ? "This rehearsal is far enough along to end. If the situation has reached a workable resting point — an agreement, a pause, a next step, or a clear refusal that ends the exchange — play a short closing beat where the moment visibly concludes, and set \"closing\": true." : "Do not end the situation yet unless the educator has clearly resolved or closed it; if they have, play a short closing beat and set \"closing\": true."}

{
  "visible_response": { "voices": [{ "name": string, "cue": string, "line": string }], "observation": string },
  "state_update": {
    "relationship_changes": string[], "participation_changes": string[],
    "newly_revealed": string[], "resolved": string[], "new_unresolved": string[],
    "trajectory": "settling" | "holding" | "escalating", "closing": boolean
  }
}

One to three voices. The observation is one to three sentences of what is visibly happening; do not include the words "What do you do next?" — that line is added automatically.`;
}

export const REVIEW_SYSTEM = `You write the After-Action Review for a Classroom Coach rehearsal. You work only from the recorded event evidence you are given: prior state, educator action, what happened, and what changed.

Be descriptive and specific. No scores, no rankings, no praise language, and never imply there was one correct response.

Return json only — a single JSON object, no prose, no markdown fences.`;

export function reviewPrompt(args: {
  spec: ScenarioSpec;
  events: {
    sequence: number;
    user_action: string | null;
    changes: string[];
    revealed: string[];
    unresolved: string[];
  }[];
  finalState: SimState;
  flags: { reason: string; note: string | null }[];
}): string {
  return `# Scenario
Practice goal: ${args.spec.practice_goal}
Reflection focus: ${args.spec.conditions.reflection_focus.join(", ") || "(not specified)"}

# Recorded events (structured evidence, not a transcript)
${args.events
  .map(
    (e) =>
      `Event ${e.sequence}\n  educator action: ${e.user_action ?? "(opening moment)"}\n  changes recorded: ${e.changes.join("; ") || "none"}\n  information revealed: ${e.revealed.join("; ") || "none"}\n  unresolved after: ${e.unresolved.join("; ") || "none"}`,
  )
  .join("\n\n")}

# Final state
${JSON.stringify(args.finalState, null, 2)}

# Flags raised by the practicing educator
${args.flags.map((f) => `- ${f.reason}${f.note ? `: ${f.note}` : ""}`).join("\n") || "- none"}

# Task
Return json:
{ "summary": string, "strengths_observed": string[], "growth_opportunities": string[], "possible_next_rehearsal": string[] }

Write for a busy reader.
- "summary": one paragraph, at most three sentences, describing what happened across the rehearsal and where it ended up.
- Each list holds two or three items. Each item is a single sentence of at most 25 words, begins with "Turn N — " naming the turn it comes from, and describes something that actually happened in the recorded events.
- No scores, no praise language, no implication that there was one correct response.`;
}
