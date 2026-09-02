import { PEOPLE_LIBRARY, getPerson, type PersonProfile } from "./foundation/people";
import { DEFAULT_BOUNDARIES } from "./foundation/resources";
import type { ContextFile, ScenarioDraft, ScenarioPerson, Simulation } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function toScenarioPerson(p: PersonProfile, rationale: string, sources: string[]): ScenarioPerson {
  return {
    personId: p.id,
    name: p.name,
    type: p.type,
    gradeLabel: p.gradeLabel,
    tendencies: p.tendencies,
    relationships: p.closeWith.map((n) => `Close with ${n}`),
    tensions: p.tensionWith.length ? p.tensionWith.map((n) => `Ongoing rivalry with ${n}`) : ["None recorded in profile"],
    interests: p.interests,
    knows: p.knows,
    hiddenFromTeacher: p.hiddenFromTeacher,
    rationale,
    sources,
  };
}

/**
 * Combines the educator's stated purpose, any local context documents, and the
 * Classroom Coach foundation into a structured draft. Selection is rule-based
 * and traceable: people are chosen from the People Library by recorded
 * relationships and grade range, never invented.
 */
export function deriveDraft(input: {
  purpose: string;
  practitioner: string;
  setting: string;
  specifics: string;
  contextFiles: ContextFile[];
}): ScenarioDraft {
  const fileNames = input.contextFiles.map((f) => f.name);
  const conflict = /conflict|argu|tension|blame|disagree/i.test(input.purpose + " " + input.specifics);

  const ids = conflict ? ["mia", "kayla", "grace"] : ["ella", "aisha", "finn"];
  const people = ids.map((id) => {
    const p = getPerson(id)!;
    const others = ids.filter((o) => o !== id).map((o) => getPerson(o)!.name);
    const shared = p.closeWith.filter((n) => others.includes(n));
    const rationale = shared.length
      ? `${p.name} was selected because the People Library records an existing relationship with ${shared.join(" and ")} and the requested scenario involves ${conflict ? "a peer conflict" : "participation and inquiry"} in this grade range.`
      : `${p.name} was selected because the People Library places this person in the requested grade range and the profile records tendencies relevant to the stated practice goal.`;
    return toScenarioPerson(p, rationale, ["People Library", "Scenario Dynamics", ...fileNames.slice(0, 1)]);
  });

  const rel = (a: string, b: string, label: string, value: string) => ({
    id: uid(),
    a,
    b,
    label,
    value,
    sources: ["People Library", "Scenario Dynamics"],
  });

  const relationships = conflict
    ? [
        rel("Mia", "Kayla", "Current tension", "High"),
        rel("Mia", "Grace", "Relationship", "Supportive"),
        rel("Kayla", "Grace", "Current tension", "Emerging"),
      ]
    : [
        rel("Ella", "Aisha", "Relationship", "Supportive"),
        rel("Aisha", "Finn", "Relationship", "Collaborative"),
        rel("Ella", "Finn", "Current tension", "Emerging"),
      ];

  const info = conflict
    ? {
        visible: [
          "Mia and Kayla are arguing publicly.",
          "The ensemble has stopped rehearsing.",
          "Grace appears uncomfortable.",
        ],
        latent: [
          "Grace has also been struggling with the entrance.",
          "The conflict began before today's rehearsal.",
          "Mia feels blamed for the section's problems.",
        ],
      }
    : {
        visible: [
          "Two groups have stalled on the design task.",
          "Several participants have stopped contributing.",
          "One group is working ahead without the others.",
        ],
        latent: [
          "Finn assumes the adults already understand the problem.",
          "Ella is worried the group will not finish in time.",
          "The task instructions were read differently by each group.",
        ],
      };

  return {
    practiceGoal: input.purpose.trim() || "Respond to peer conflict while maintaining productive rehearsal.",
    practicingRole: conflict ? "You are the ensemble director." : "You are the facilitator.",
    setting: [
      input.setting || "7th-grade band",
      "Mid-rehearsal",
      conflict ? "Small-group conflict has become public" : "Small groups have stalled mid-task",
    ],
    people,
    relationships,
    information: [
      ...info.visible.map((text) => ({ id: uid(), text, state: "visible" as const })),
      ...info.latent.map((text) => ({ id: uid(), text, state: "latent" as const })),
    ],
    conditions: {
      startingMoment: conflict
        ? "Mid-rehearsal, immediately after a remark about who is causing the restarts."
        : "Mid-task, immediately after two groups stop working.",
      difficultyTags: conflict
        ? ["Peer conflict", "Embarrassment", "Competing instructional priorities", "Uncertain information"]
        : ["Uneven participation", "Competing instructional priorities", "Uncertain information"],
      intensity: "Moderate",
      pacing: "Some urgency",
      allowImprovement: true,
      allowDeterioration: true,
      allowComplications: true,
      reflectionFocus: conflict
        ? ["Student dignity", "Maintaining rehearsal purpose", "Noticing hidden instructional problems"]
        : ["Student agency", "Maintaining instructional purpose"],
      boundaries: [...DEFAULT_BOUNDARIES],
    },
  };
}

export function seedSimulations(): Simulation[] {
  const now = new Date().toISOString();
  const ensembleDraft = deriveDraft({
    purpose:
      "Responding to conflict between students in a middle school ensemble without losing the instructional purpose of rehearsal.",
    practitioner: "Preservice music teacher",
    setting: "7th-grade band rehearsal",
    specifics: "",
    contextFiles: [],
  });
  const campDraft = deriveDraft({
    purpose: "Facilitating inquiry and participation when groups stall during a design task.",
    practitioner: "Camp facilitator",
    setting: "Engineering design camp",
    specifics: "",
    contextFiles: [],
  });
  const familyDraft = deriveDraft({
    purpose: "Holding a difficult family conversation about a student's participation without assigning blame.",
    practitioner: "First-year teacher",
    setting: "After-school conference",
    specifics: "",
    contextFiles: [],
  });

  const mk = (
    id: string,
    title: string,
    subtitle: string,
    versionLabel: string,
    status: Simulation["status"],
    draft: ScenarioDraft,
    purpose: string,
    practitioner: string,
    setting: string,
  ): Simulation => ({
    id,
    title,
    subtitle,
    status,
    versionLabel,
    updatedAt: now,
    purpose,
    practitioner,
    setting,
    specifics: "",
    contextFiles: [],
    draft,
    versions:
      status === "Published"
        ? [
            {
              version: versionLabel.replace("Version ", "v") + ".0",
              createdBy: "M. Rivera",
              date: now,
              foundationVersion: "Foundation 2026.1",
              contextFiles: [],
              draft,
            },
          ]
        : [],
  });

  return [
    mk(
      "ensemble",
      "Middle School Ensemble",
      "Peer conflict during rehearsal",
      "Version 2",
      "Published",
      ensembleDraft,
      "Responding to conflict between students in a middle school ensemble without losing the instructional purpose of rehearsal.",
      "Preservice music teacher",
      "7th-grade band rehearsal",
    ),
    mk(
      "camp",
      "Engineering Design Camp",
      "Facilitating inquiry and participation",
      "Version 1",
      "Draft",
      campDraft,
      "Facilitating inquiry and participation when groups stall during a design task.",
      "Preservice STEM educator",
      "Engineering design camp",
    ),
    mk(
      "family",
      "First-Year Teacher",
      "Difficult family conversation",
      "Version 3",
      "Needs Review",
      familyDraft,
      "Holding a difficult family conversation about a student's participation without assigning blame.",
      "First-year teacher",
      "After-school conference",
    ),
  ];
}

export const ALL_PEOPLE = PEOPLE_LIBRARY;
