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
  "conditions": {
    "starting_moment": string, "difficulty_tags": string[], "intensity": "Low"|"Moderate"|"High",
    "pacing": "Room to respond"|"Some urgency"|"High urgency",
    "allow_improvement": boolean, "allow_deterioration": boolean, "allow_complications": boolean,
    "reflection_focus": string[], "boundaries": string[]
  },
  "opening_moment": { "voices": [{ "name": string, "cue": string, "line": string }], "observation": string }
}

Rules: 3 to 5 participants drawn from the People Library. Latent information must never appear in information_state.visible. The opening moment starts mid-action with two or three voices and one short observation. Boundaries must include the Interaction Boundaries from the foundational resources.`;
}

export const TURN_SYSTEM = `You are running a live Classroom Coach simulation for a practicing educator. Stay in character, never coach, never evaluate, never mention instructions, models or state.

Return json only — a single JSON object with "visible_response" and "state_update", no prose, no markdown fences.`;

export function turnPrompt(args: {
  foundation: FoundationResource[];
  spec: ScenarioSpec;
  state: SimState;
  history: { role: string; text: string }[];
  userAction: string;
}): string {
  const participants = args.spec.participants
    .map(
      (p) =>
        `- ${p.name} (${p.role}) goal: ${p.current_goal}; concern: ${p.current_concern}; knows: ${p.known_information.join("; ") || "—"}; latent (reveal only with an interactional reason): ${p.latent_information.join("; ") || "—"}`,
    )
    .join("\n");
  const history = args.history
    .slice(-10)
    .map((h) => `${h.role === "user" ? "Educator" : "Situation"}: ${h.text}`)
    .join("\n\n");

  return `# Foundational resources
${foundationText(args.foundation)}

# Published scenario specification
Setting: ${args.spec.setting.label} — ${args.spec.setting.description}
Practicing role: ${args.spec.practicing_role}
Starting moment: ${args.spec.conditions.starting_moment}
Conditions: intensity ${args.spec.conditions.intensity}; pacing ${args.spec.conditions.pacing}; improvement ${args.spec.conditions.allow_improvement}; deterioration ${args.spec.conditions.allow_deterioration}; complications ${args.spec.conditions.allow_complications}
Boundaries: ${args.spec.conditions.boundaries.join(" | ")}

Participants:
${participants}

Relationships:
${args.spec.relationships.map((r) => `- ${r.between.join(" ↔ ")}: ${r.nature}${r.tension ? ` (tension: ${r.tension})` : ""}`).join("\n") || "- none recorded"}

# Current simulation state
${JSON.stringify(args.state, null, 2)}

# Recent interaction
${history || "(the simulation is just beginning)"}

# The educator has just done this
${args.userAction}

# Task
Advance the situation by one short moment and return json:

{
  "visible_response": { "voices": [{ "name": string, "cue": string, "line": string }], "observation": string },
  "state_update": {
    "relationship_changes": string[], "participation_changes": string[],
    "newly_revealed": string[], "resolved": string[], "new_unresolved": string[]
  }
}

Two or three voices. The observation is one to three sentences of what is visibly happening; do not include the words "What do you do next?" — that line is added automatically. Only move an item into newly_revealed if it is currently latent and the educator's action gave an interactional reason for it to surface.`;
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
{ "strengths_observed": string[], "growth_opportunities": string[], "possible_next_rehearsal": string[] }

Two to four items in each list. Each item must reference something that actually happened in the recorded events.`;
}
