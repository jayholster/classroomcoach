import { z } from "zod";

/**
 * Shared, client-safe schemas. The Design Lab editor and the server-side
 * validators both use these so the structured specification cannot drift.
 */

export const ProvenanceSchema = z.array(z.string()).default([]);

export const ParticipantSchema = z.object({
  id: z.string(),
  profile_source_id: z.string().nullable().default(null),
  name: z.string(),
  role: z.string().default(""),
  scenario_relevant_background: z.string().default(""),
  current_goal: z.string().default(""),
  current_concern: z.string().default(""),
  known_information: z.array(z.string()).default([]),
  latent_information: z.array(z.string()).default([]),
  provenance: ProvenanceSchema,
});

export const RelationshipSchema = z.object({
  id: z.string(),
  between: z.array(z.string()).default([]),
  nature: z.string().default(""),
  tension: z.string().default(""),
  provenance: ProvenanceSchema,
});

export const ConditionsSchema = z.object({
  starting_moment: z.string().default(""),
  difficulty_tags: z.array(z.string()).default([]),
  intensity: z.string().default("Moderate"),
  pacing: z.string().default("Some urgency"),
  allow_improvement: z.boolean().default(true),
  allow_deterioration: z.boolean().default(true),
  allow_complications: z.boolean().default(true),
  reflection_focus: z.array(z.string()).default([]),
  boundaries: z.array(z.string()).default([]),
});

export const VoiceSchema = z.object({
  name: z.string(),
  cue: z.string().default(""),
  line: z.string().default(""),
});

export const OpeningMomentSchema = z.object({
  voices: z.array(VoiceSchema).default([]),
  observation: z.string().default(""),
});

export const ScenarioSpecSchema = z.object({
  title: z.string().default("Untitled simulation"),
  subtitle: z.string().default(""),
  practice_goal: z.string().default(""),
  practicing_role: z.string().default(""),
  setting: z
    .object({ label: z.string().default(""), description: z.string().default("") })
    .default({ label: "", description: "" }),
  participants: z.array(ParticipantSchema).default([]),
  relationships: z.array(RelationshipSchema).default([]),
  information_state: z
    .object({
      visible: z.array(z.string()).default([]),
      latent: z.array(z.string()).default([]),
    })
    .default({ visible: [], latent: [] }),
  conditions: ConditionsSchema.default({}),
  opening_moment: OpeningMomentSchema.default({ voices: [], observation: "" }),
});

export type ScenarioSpec = z.infer<typeof ScenarioSpecSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type OpeningMoment = z.infer<typeof OpeningMomentSchema>;

export const SimStateSchema = z.object({
  active_participants: z.array(z.string()).default([]),
  unresolved: z.array(z.string()).default([]),
  participation: z.array(z.string()).default([]),
  relationship_changes: z.array(z.string()).default([]),
  revealed: z.array(z.string()).default([]),
  latent: z.array(z.string()).default([]),
});
export type SimState = z.infer<typeof SimStateSchema>;

export const VisibleResponseSchema = z.object({
  voices: z.array(VoiceSchema).default([]),
  observation: z.string().default(""),
});
export type VisibleResponse = z.infer<typeof VisibleResponseSchema>;

export const StateUpdateSchema = z.object({
  relationship_changes: z.array(z.string()).default([]),
  participation_changes: z.array(z.string()).default([]),
  newly_revealed: z.array(z.string()).default([]),
  resolved: z.array(z.string()).default([]),
  new_unresolved: z.array(z.string()).default([]),
});
export type StateUpdate = z.infer<typeof StateUpdateSchema>;

export const TurnOutputSchema = z.object({
  visible_response: VisibleResponseSchema,
  state_update: StateUpdateSchema,
});
export type TurnOutput = z.infer<typeof TurnOutputSchema>;

export const ReviewSchema = z.object({
  strengths_observed: z.array(z.string()).default([]),
  growth_opportunities: z.array(z.string()).default([]),
  possible_next_rehearsal: z.array(z.string()).default([]),
});
export type ReviewSynthesis = z.infer<typeof ReviewSchema>;

/** Renders a visible response into the Classroom Coach transcript format. */
export function renderVisibleResponse(vr: VisibleResponse): string {
  const voices = vr.voices.map((v) => `[${v.name}${v.cue ? `, ${v.cue}` : ""}]: "${v.line}"`).join("\n");
  const cleaned = vr.observation.replace(/^→\s*/, "").replace(/\s*What do you do next\?\s*$/i, "");
  const observation = cleaned ? `\n\n→ ${cleaned}` : "";
  return `${voices}${observation}\n\nWhat do you do next?`;
}

export function applyStateUpdate(state: SimState, update: StateUpdate): SimState {
  const merge = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));
  return {
    active_participants: state.active_participants,
    relationship_changes: merge(state.relationship_changes, update.relationship_changes),
    participation: merge(state.participation, update.participation_changes),
    revealed: merge(state.revealed, update.newly_revealed),
    latent: state.latent.filter((l) => !update.newly_revealed.includes(l)),
    unresolved: merge(
      state.unresolved.filter((u) => !update.resolved.includes(u)),
      update.new_unresolved,
    ),
  };
}
