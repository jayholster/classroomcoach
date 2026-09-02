import type { ParticipantType } from "./foundation/people";

export type SimStatus = "Draft" | "Published" | "Needs Review";

export interface ContextFile {
  id: string;
  name: string;
  chars: number;
  excerpt: string;
}

export interface ScenarioPerson {
  personId: string;
  name: string;
  type: ParticipantType;
  gradeLabel: string;
  tendencies: string[];
  relationships: string[];
  tensions: string[];
  interests: string[];
  knows: string[];
  hiddenFromTeacher: string[];
  rationale: string;
  sources: string[];
}

export interface SituationalRelationship {
  id: string;
  a: string;
  b: string;
  label: string;
  value: string;
  sources: string[];
}

export interface InfoItem {
  id: string;
  text: string;
  state: "visible" | "latent";
}

export interface ScenarioConditions {
  startingMoment: string;
  difficultyTags: string[];
  intensity: "Low" | "Moderate" | "High";
  pacing: "Room to respond" | "Some urgency" | "High urgency";
  allowImprovement: boolean;
  allowDeterioration: boolean;
  allowComplications: boolean;
  reflectionFocus: string[];
  boundaries: string[];
}

export interface ScenarioDraft {
  practiceGoal: string;
  practicingRole: string;
  setting: string[];
  people: ScenarioPerson[];
  relationships: SituationalRelationship[];
  information: InfoItem[];
  conditions: ScenarioConditions;
}

export interface PublishedVersion {
  version: string;
  createdBy: string;
  date: string;
  foundationVersion: string;
  contextFiles: string[];
  draft: ScenarioDraft;
}

export interface Simulation {
  id: string;
  title: string;
  subtitle: string;
  status: SimStatus;
  versionLabel: string;
  updatedAt: string;
  purpose: string;
  practitioner: string;
  setting: string;
  specifics: string;
  contextFiles: ContextFile[];
  draft: ScenarioDraft;
  versions: PublishedVersion[];
}

export interface SimState {
  activeParticipants: string[];
  unresolved: string[];
  participation: string[];
  relationshipChanges: string[];
  revealed: string[];
  latent: string[];
}

export interface Flag {
  turnId: string;
  reason: string;
  note?: string;
}

export interface Turn {
  id: string;
  role: "system" | "user";
  text: string;
  stateChanges?: string[];
  stateBefore?: SimState;
}

export interface Session {
  id: string;
  simulationId: string;
  simulationTitle: string;
  startedAt: string;
  endedAt?: string;
  turns: Turn[];
  state: SimState;
  flags: Flag[];
}

export type Role = "Designer / Educator" | "Learner" | "Admin / Research";
