export interface FoundationResource {
  id: string;
  name: string;
  status: "Active";
  governs: string;
}

export const FOUNDATION_VERSION = "Foundation 2026.1";

export const FOUNDATION_RESOURCES: FoundationResource[] = [
  {
    id: "core",
    name: "Core Simulation Instructions",
    status: "Active",
    governs:
      "How a simulation opens mid-action, how student voices are structured, and how briefly the room is described.",
  },
  {
    id: "people",
    name: "People Library",
    status: "Active",
    governs:
      "The library of simulated people, their developmental and relational information, interests, and what each person knows.",
  },
  {
    id: "dynamics",
    name: "Scenario Dynamics",
    status: "Active",
    governs:
      "Minute-by-minute progression, concurrent events, and immediate feedback loops after each teacher action.",
  },
  {
    id: "boundaries",
    name: "Interaction Boundaries",
    status: "Active",
    governs:
      "Student agency and dignity, avoidance of stereotype, and refusal to direct the practicing teacher toward one correct response.",
  },
  {
    id: "consequences",
    name: "Relational Consequences",
    status: "Active",
    governs:
      "How positive and negative outcomes accumulate across turns and how end-of-simulation reflection is framed.",
  },
];

export const FOUNDATION_SUMMARY =
  "These expert-developed resources govern how people, relationships, scenario progression, consequences, and reflection behave across simulations.";

export const DEFAULT_BOUNDARIES = [
  "Do not diagnose students.",
  "Do not reveal hidden information without an interactional reason.",
  "Students should retain agency.",
  "Avoid stereotyped behavior.",
  'Do not force a single "correct" teacher response.',
];
