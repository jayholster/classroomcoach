/**
 * Field registry for research datasets.
 *
 * Every exportable variable is declared here once, with the family it belongs
 * to, a plain-language definition, and whether it is CORE OPERATIONAL (always
 * available, because the application needs it to run) or OPTIONAL RESEARCH
 * (only available when the study has enabled that family).
 *
 * The same registry generates the data dictionary that accompanies an export,
 * so a dataset can never contain a field that is not documented.
 */

import type { Json } from "@/integrations/supabase/types";

export type FieldFamily =
  | "session"
  | "scenario"
  | "interaction"
  | "state"
  | "provenance"
  | "contestability"
  | "review"
  | "authoring"
  | "technical"
  | "assurance"
  | "study";

export type FieldTier = "core" | "optional";

export interface FieldDefinition {
  key: string;
  label: string;
  family: FieldFamily;
  tier: FieldTier;
  description: string;
}

export const FAMILY_LABELS: Record<FieldFamily, string> = {
  session: "Session",
  scenario: "Scenario",
  interaction: "Interaction",
  state: "Simulation state",
  provenance: "Provenance",
  contestability: "Contestability",
  review: "After-action review",
  authoring: "Authoring",
  technical: "Technical",
  assurance: "Assurance",
  study: "Study variables",
};

export const FAMILY_TIER: Record<FieldFamily, FieldTier> = {
  session: "core",
  scenario: "core",
  interaction: "core",
  state: "core",
  provenance: "core",
  contestability: "core",
  review: "optional",
  authoring: "optional",
  technical: "optional",
  assurance: "optional",
  study: "optional",
};

export const FIELDS: FieldDefinition[] = [
  // Session
  f("session_id", "Session ID", "session", "Stable identifier for one rehearsal."),
  f("participant_pseudonym", "Participant", "session", "Study-specific pseudonymous code for the person rehearsing. Account identity is never exported."),
  f("session_started_at", "Started at", "session", "UTC timestamp when the rehearsal began."),
  f("session_ended_at", "Ended at", "session", "UTC timestamp when the rehearsal was closed, blank if still open."),
  f("session_completed", "Completed", "session", "True when the rehearsal was formally ended."),
  f("assignment_id", "Assignment ID", "session", "Assignment the rehearsal was launched from, if any."),
  f("group_id", "Group ID", "session", "Course or group the assignment belongs to."),
  f("turn_count", "Turns in session", "session", "Number of recorded educator actions in the rehearsal."),
  // Scenario
  f("scenario_id", "Scenario ID", "scenario", "Identifier of the simulation."),
  f("scenario_title", "Scenario title", "scenario", "Title of the simulation as published."),
  f("scenario_version_id", "Version ID", "scenario", "Frozen published version the rehearsal ran against."),
  f("scenario_version_label", "Version label", "scenario", "Human-readable version label."),
  f("participant_count", "Participants in scenario", "scenario", "Number of simulated people in the version."),
  // Interaction
  f("event_id", "Event ID", "interaction", "Identifier of one recorded moment."),
  f("sequence", "Turn number", "interaction", "Position of this moment within the rehearsal."),
  f("event_created_at", "Recorded at", "interaction", "UTC timestamp when the moment was recorded."),
  f("user_action", "Educator action", "interaction", "Exactly what the person rehearsing wrote. OBSERVED data."),
  f("visible_response", "Simulation response", "interaction", "What the simulation showed back. MODEL-GENERATED data."),
  f("event_status", "Moment status", "interaction", "Whether the moment completed or errored."),
  // State
  f("prior_state", "State before", "state", "Simulation state immediately before the action."),
  f("state_update", "State change", "state", "The change the simulation recorded for this moment."),
  f("resulting_state", "State after", "state", "Simulation state immediately after the moment."),
  f("revealed_count", "Revealed items", "state", "How many previously latent items are now revealed."),
  f("unresolved_count", "Unresolved items", "state", "How many situation threads remain open."),
  // Provenance
  f("foundation_version", "Foundation version", "provenance", "Version of the expert foundation the moment ran under."),
  f("model_provider", "Model provider", "provenance", "Provider that produced the response."),
  f("model_identifier", "Model", "provenance", "Model identifier that produced the response."),
  f("model_config_id", "Model configuration", "provenance", "Configuration record used for the call."),
  f("app_release", "Application release", "provenance", "Build of the application that recorded the moment."),
  // Contestability
  f("flagged", "Flagged", "contestability", "True when a person flagged this moment."),
  f("flag_reason", "Flag reason", "contestability", "Why the moment was flagged."),
  f("flag_note", "Flag note", "contestability", "Free-text note left with the flag."),
  f("flag_status", "Flag status", "contestability", "Whether the flag is open or resolved."),
  f("annotation_count", "Annotations", "contestability", "Number of researcher annotations on this moment."),
  // Review (optional)
  f("review_present", "Review generated", "review", "True when an after-action review exists for the rehearsal."),
  f("review_strengths", "Review strengths", "review", "Strengths recorded in the after-action review."),
  f("review_growth", "Review growth areas", "review", "Growth areas recorded in the after-action review."),
  f("review_next", "Next rehearsal focus", "review", "Suggested focus for the next rehearsal."),
  // Authoring (optional)
  f("authored_by", "Authoring label", "authoring", "Label recorded for whoever published the version."),
  f("version_created_at", "Version published at", "authoring", "When the version was frozen."),
  f("context_document_count", "Context documents", "authoring", "How many local context documents fed the version."),
  // Technical (optional)
  f("latency_ms", "Latency (ms)", "technical", "Time the model call took for this moment."),
  f("input_tokens", "Input tokens", "technical", "Tokens sent for this moment."),
  f("output_tokens", "Output tokens", "technical", "Tokens returned for this moment."),
  f("estimated_cost_usd", "Estimated cost (USD)", "technical", "Estimated cost of the call."),
  f("repaired", "Repaired output", "technical", "True when malformed model output had to be repaired once."),
  // Assurance (optional)
  f("assurance_run_count", "Assurance re-runs", "assurance", "How many times this moment was re-run for assurance."),
  // Study (optional)
  f("study_condition", "Study condition", "study", "Condition label recorded in the study settings, if configured."),
];

function f(key: string, label: string, family: FieldFamily, description: string): FieldDefinition {
  return { key, label, family, tier: FAMILY_TIER[family], description };
}

export const FIELD_MAP = new Map(FIELDS.map((x) => [x.key, x]));

export const DEFAULT_FIELDS = [
  "session_id",
  "participant_pseudonym",
  "scenario_title",
  "scenario_version_label",
  "sequence",
  "user_action",
  "visible_response",
  "flagged",
  "foundation_version",
  "model_identifier",
];

export interface DatasetDefinition {
  fields: string[];
  families: FieldFamily[];
  filters: {
    scenarioId?: string;
    groupId?: string;
    assignmentId?: string;
    from?: string;
    to?: string;
    completedOnly?: boolean;
    flaggedOnly?: boolean;
  };
  limit?: number;
}

export const EMPTY_DEFINITION: DatasetDefinition = {
  fields: DEFAULT_FIELDS,
  families: ["session", "scenario", "interaction", "state", "provenance", "contestability"],
  filters: {},
  limit: 2000,
};

/** Which families a study collects. Core families are always on. */
export interface CollectionSettings {
  optionalFamilies?: FieldFamily[];
  studyCondition?: string;
}

export function enabledFamilies(settings: CollectionSettings | null | undefined): FieldFamily[] {
  const optional = settings?.optionalFamilies ?? [];
  return (Object.keys(FAMILY_TIER) as FieldFamily[]).filter(
    (fam) => FAMILY_TIER[fam] === "core" || optional.includes(fam),
  );
}

export function availableFields(settings: CollectionSettings | null | undefined): FieldDefinition[] {
  const allowed = new Set(enabledFamilies(settings));
  return FIELDS.filter((field) => allowed.has(field.family));
}

export function dataDictionary(fieldKeys: string[]) {
  return fieldKeys
    .map((key) => FIELD_MAP.get(key))
    .filter((x): x is FieldDefinition => Boolean(x))
    .map((x) => ({
      field: x.key,
      label: x.label,
      family: FAMILY_LABELS[x.family],
      collection: x.tier === "core" ? "Core operational" : "Optional research",
      definition: x.description,
    }));
}

export function toCsv(fieldKeys: string[], rows: { [key: string]: Json | undefined }[]): string {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = fieldKeys.join(",");
  const body = rows.map((row) => fieldKeys.map((key) => escape(row[key])).join(",")).join("\n");
  return `${header}\n${body}`;
}
