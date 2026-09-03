/**
 * Deterministic script for the self-playing demo at /demo.
 *
 * No AI calls, no database reads, no auth. Every value is written by hand so a
 * screen recording is identical on every take. The shapes deliberately mirror
 * the real ScenarioSpec / state_update / review shapes used by the product so
 * the demo cannot drift from what the application actually produces.
 */

export type DemoPhase = "design" | "build" | "spec" | "rehearse" | "review";

export type DemoVoice = { name: string; cue: string; line: string };

export type DemoStep =
  | { kind: "design-select"; caption: string; ms: number; field: DesignField; value: string }
  | { kind: "build"; caption: string; ms: number; stage: string }
  | { kind: "spec-reveal"; caption: string; ms: number; part: "cast" | "relationships" | "opening" }
  | { kind: "opening"; caption: string; ms: number; voices: DemoVoice[]; observation: string }
  | { kind: "educator"; caption: string; ms: number; text: string }
  | {
      kind: "response";
      caption: string;
      ms: number;
      voices: DemoVoice[];
      observation: string;
      read: { improving: string[]; strained: string[]; revealed: string[] };
      trajectory: "settling" | "holding" | "escalating";
    }
  | { kind: "scene"; caption: string; ms: number; label: string; present: string[] }
  | { kind: "closing"; caption: string; ms: number }
  | { kind: "review"; caption: string; ms: number };

export type DesignField = "focus" | "moment" | "students" | "practitioner" | "setting" | "others";

export const DESIGN_FIELDS: { field: DesignField; label: string; options: string[] }[] = [
  {
    field: "focus",
    label: "What should people practice?",
    options: ["De-escalating conflict", "Holding a boundary", "Responding to a challenge to your authority", "Delivering hard news"],
  },
  {
    field: "moment",
    label: "Choose the difficult moment",
    options: [
      "Two people escalate in front of everyone",
      "Someone refuses to participate",
      "A family member arrives upset",
      "A rule is questioned publicly",
    ],
  },
  { field: "students", label: "How many students", options: ["1", "2", "3"] },
  { field: "practitioner", label: "Who is practicing", options: ["Classroom teacher", "Program facilitator", "Site coordinator"] },
  { field: "setting", label: "Setting", options: ["Middle-grades classroom, end of period", "Afterschool program room", "Museum workshop space"] },
  {
    field: "others",
    label: "Others in the situation",
    options: ["Parent or guardian", "Administrator", "Another teacher", "Paraprofessional"],
  },
];

export const DEMO_CAST = [
  {
    name: "Aisha",
    role: "Student, grade 7",
    goal: "Be taken seriously without backing down in front of the class",
    concern: "Looking like she started it",
  },
  {
    name: "Ben",
    role: "Student, grade 7",
    goal: "Get the last word and leave",
    concern: "Being embarrassed in front of people he cares about",
  },
  {
    name: "Ms. Reyes",
    role: "Parent or guardian (arriving for early pickup)",
    goal: "Understand what just happened to her child",
    concern: "That this has happened before and nothing changed",
  },
];

export const DEMO_RELATIONSHIPS = [
  { between: "Aisha ↔ Ben", nature: "Former group partners", tension: "A project split badly two weeks ago" },
  { between: "Ben ↔ Ms. Reyes", nature: "Parent and child", tension: "Ben does not want her to see this" },
];

export const DEMO_PROVENANCE = [
  "Practice purpose",
  "People Library: aisha",
  "People Library: ben",
  "Context: family-communication-policy.docx part 2",
  "Foundation: Scenario Dynamics",
];

export const DEMO_REVIEW = {
  summary:
    "You separated a public argument from the conversation it actually needed, named what each person was protecting, and reached a workable pause with a next step. The exchange ended calmly with Ms. Reyes informed and both students still in the room.",
  sections: [
    {
      title: "What you did that moved things",
      items: [
        "Turn 2 — Naming Aisha's concern about being blamed shifted her from defending herself to explaining.",
        "Turn 4 — Pulling Ben aside removed the audience and his tone dropped almost immediately.",
      ],
    },
    {
      title: "Where it stalled",
      items: [
        "Turn 3 — Asking both students to speak at once kept them performing for the room.",
        "Turn 5 — Ms. Reyes was addressed last, after she had already formed a read of the situation.",
      ],
    },
    {
      title: "Try next",
      items: [
        "Rehearse the same moment with the guardian present from the first turn.",
        "Try holding the boundary before naming feelings and see what changes.",
      ],
    },
  ],
  feedback: {
    author: "Instructor note — Dr. Whitfield",
    text: "Good instinct on separating Ben from the audience. Next time, say out loud what will happen next so nobody has to guess.",
  },
};

const OPENING_VOICES: DemoVoice[] = [
  { name: "Aisha", cue: "standing, chair pushed back", line: "I'm not the one who started this." },
  { name: "Ben", cue: "to the room, not to her", line: "Sure. That's not what everyone saw." },
];

export const DEMO_SCRIPT: DemoStep[] = [
  { kind: "design-select", caption: "Choosing what people should practice", ms: 1500, field: "focus", value: "De-escalating conflict" },
  {
    kind: "design-select",
    caption: "Choosing the difficult moment",
    ms: 1500,
    field: "moment",
    value: "Two people escalate in front of everyone",
  },
  { kind: "design-select", caption: "Setting the size of the room", ms: 1100, field: "students", value: "2" },
  { kind: "design-select", caption: "Naming who is practicing", ms: 1100, field: "practitioner", value: "Classroom teacher" },
  { kind: "design-select", caption: "Setting the place", ms: 1300, field: "setting", value: "Middle-grades classroom, end of period" },
  { kind: "design-select", caption: "Adding others who are in the situation", ms: 1500, field: "others", value: "Parent or guardian" },

  { kind: "build", caption: "Saving your setup", ms: 1400, stage: "Saving your setup" },
  { kind: "build", caption: "Reading your local context", ms: 1900, stage: "Reading your documents" },
  {
    kind: "build",
    caption: "Deriving the people, relationships, and opening moment",
    ms: 2400,
    stage: "Deriving the people, relationships, and opening moment",
  },

  { kind: "spec-reveal", caption: "The people who will be in the room", ms: 2600, part: "cast" },
  { kind: "spec-reveal", caption: "What is already between them", ms: 2200, part: "relationships" },
  { kind: "spec-reveal", caption: "Where the situation begins", ms: 2400, part: "opening" },

  { kind: "opening", caption: "The rehearsal begins mid-moment", ms: 3200, voices: OPENING_VOICES, observation: "The room has gone quiet around them. Six students are still packing up, watching sideways." },
  { kind: "educator", caption: "You respond in your own words", ms: 3000, text: "Aisha, I'm not deciding who started anything. I want to hear what happened from you." },
  {
    kind: "response",
    caption: "The room responds",
    ms: 4000,
    voices: [
      { name: "Aisha", cue: "sits back down, arms still crossed", line: "He said I did nothing on the project. In front of everybody." },
      { name: "Ben", cue: "quieter", line: "That's not — that's not what I said." },
    ],
    observation: "Aisha's voice drops out of the argument and into an explanation. Ben looks at the door.",
    read: { improving: ["Aisha stopped defending and started explaining"], strained: [], revealed: ["The project split two weeks ago"] },
    trajectory: "settling",
  },
  { kind: "educator", caption: "You change the shape of the conversation", ms: 2800, text: "Ben, come talk with me by the window for a second." },
  { kind: "scene", caption: "You can pull someone aside — the cast stays fixed", ms: 2600, label: "By the window, away from the class", present: ["Ben"] },
  {
    kind: "response",
    caption: "Away from the audience, something surfaces",
    ms: 4200,
    voices: [
      { name: "Ben", cue: "looking at the floor", line: "My mom's outside. She's picking me up early. I didn't want her to walk into this." },
    ],
    observation: "Without the class watching, his volume drops entirely. He is not arguing anymore.",
    read: { improving: ["Ben is no longer performing for the room"], strained: [], revealed: ["Ben's guardian is arriving and he is afraid of what she will see"] },
    trajectory: "settling",
  },
  { kind: "educator", caption: "You name what he is protecting", ms: 3000, text: "That makes sense. Here's what I'll tell her: you two had a disagreement and you handled the rest of it with me." },
  {
    kind: "response",
    caption: "The situation reaches a resting point",
    ms: 4200,
    voices: [
      { name: "Ben", cue: "exhales", line: "Okay. Yeah. Okay." },
      { name: "Ms. Reyes", cue: "from the doorway", line: "Everything alright in here?" },
    ],
    observation: "Ben straightens up. Aisha has picked her bag back up and is waiting, not watching.",
    read: { improving: ["Ben accepted a next step", "Aisha disengaged from the conflict"], strained: [], revealed: [] },
    trajectory: "settling",
  },
  { kind: "closing", caption: "The rehearsal reaches its close", ms: 3200 },
  { kind: "review", caption: "What changed, and what to try next", ms: 9000 },
];

export function phaseOf(step: DemoStep): DemoPhase {
  switch (step.kind) {
    case "design-select":
      return "design";
    case "build":
      return "build";
    case "spec-reveal":
      return "spec";
    case "review":
      return "review";
    default:
      return "rehearse";
  }
}

export const DEMO_TOTAL_MS = DEMO_SCRIPT.reduce((sum, s) => sum + s.ms, 0);
