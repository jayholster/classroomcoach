export type ParticipantType =
  | "Student"
  | "Parent / caregiver"
  | "Colleague"
  | "Administrator"
  | "Community member";

export interface PersonProfile {
  id: string;
  name: string;
  type: ParticipantType;
  gradeLabel: string;
  descriptor: string;
  background: string;
  ses: string;
  tendencies: string[];
  closeWith: string[];
  tensionWith: string[];
  interests: string[];
  knows: string[];
  hiddenFromTeacher: string[];
}

/**
 * Representative subset (10 of 62) of the Classroom Coach People Library,
 * preserving the grade-specific detail and relationships in the source document.
 */
export const PEOPLE_LIBRARY: PersonProfile[] = [
  {
    id: "mia",
    name: "Mia",
    type: "Student",
    gradeLabel: "7th-grade student",
    descriptor: "Creativity drives Mia; she joined the school's theater club.",
    background: "Hispanic, lives with both parents",
    ses: "Low",
    tendencies: [
      "Expressive and imaginative; responds strongly to being singled out",
      "Speaks up when she feels her effort is misread",
    ],
    closeWith: ["Kayla", "Grace"],
    tensionWith: [],
    interests: ["Language arts", "Drama", "Writing and performing in school plays"],
    knows: ["What was said about her section yesterday"],
    hiddenFromTeacher: ["She feels blamed for the section's problems"],
  },
  {
    id: "kayla",
    name: "Kayla",
    type: "Student",
    gradeLabel: "7th-grade student",
    descriptor: "Creativity drives Kayla; drama club, started the school newspaper.",
    background: "Asian American, has an older sibling",
    ses: "High",
    tendencies: [
      "Socially confident; narrates group problems out loud",
      "Defends her own account before considering another",
    ],
    closeWith: ["Mia", "Quinn"],
    tensionWith: [],
    interests: ["Language arts", "Art", "Creative writing and storytelling"],
    knows: ["The group has restarted the passage several times"],
    hiddenFromTeacher: ["She said something similar during yesterday's rehearsal"],
  },
  {
    id: "grace",
    name: "Grace",
    type: "Student",
    gradeLabel: "7th-grade student",
    descriptor: "Creativity drives Grace; wins local art contests, digital illustration.",
    background: "African American, lives with grandparents",
    ses: "Low",
    tendencies: [
      "Hesitant in public disagreement; agrees quietly then withdraws",
      "Notices peers' discomfort before adults do",
    ],
    closeWith: ["Aisha", "Ella", "Mia"],
    tensionWith: [],
    interests: ["Art", "Technology", "Digital illustration"],
    knows: ["Both accounts of what happened yesterday"],
    hiddenFromTeacher: ["She has also been struggling with the entrance"],
  },
  {
    id: "ella",
    name: "Ella",
    type: "Student",
    gradeLabel: "7th-grade student",
    descriptor: "Responsibility motivates Ella; balances student council with advanced classes.",
    background: "Asian American, parents own a restaurant",
    ses: "Middle",
    tendencies: ["Takes on organizing roles", "Uncomfortable when a group stalls"],
    closeWith: ["Aisha", "Clara"],
    tensionWith: [],
    interests: ["Language arts", "History", "Student council"],
    knows: ["The rehearsal schedule and what still needs work"],
    hiddenFromTeacher: ["She is worried the group will not be ready in time"],
  },
  {
    id: "aisha",
    name: "Aisha",
    type: "Student",
    gradeLabel: "7th-grade student",
    descriptor: "Motivated by achievement; coding and robotics competitions.",
    background: "Middle Eastern, trilingual (Arabic/English/French)",
    ses: "Low",
    tendencies: ["Direct about accuracy", "Impatient with unclear instructions"],
    closeWith: ["Ella", "Grace"],
    tensionWith: ["Ben"],
    interests: ["Computer science", "Math", "Her science blog"],
    knows: ["Exactly where the group last broke down"],
    hiddenFromTeacher: ["She tutors her younger siblings before school and arrives tired"],
  },
  {
    id: "ben",
    name: "Ben",
    type: "Student",
    gradeLabel: "7th-grade student",
    descriptor: "Collaboration motivates Ben; regional robotics competitions, tech blog.",
    background: "Caucasian, lives with both parents",
    ses: "Middle",
    tendencies: ["Jumps to fixing things", "Uses humor to defuse tension"],
    closeWith: ["Clara", "Finn"],
    tensionWith: ["Aisha"],
    interests: ["Robotics", "Technology", "Art"],
    knows: ["Who has been leaving early"],
    hiddenFromTeacher: ["He finds the rivalry with Aisha more stressful than he shows"],
  },
  {
    id: "clara",
    name: "Clara",
    type: "Student",
    gradeLabel: "7th-grade student",
    descriptor: "Recognition motivates Clara; her artwork gains regional attention.",
    background: "Hispanic, bilingual (Spanish/English)",
    ses: "High",
    tendencies: ["Leads initiatives", "Feels pressure to keep succeeding"],
    closeWith: ["Ella", "Finn"],
    tensionWith: [],
    interests: ["Art", "Community art projects", "Her art blog"],
    knows: ["Which students are usually asked to lead"],
    hiddenFromTeacher: ["She is anxious about maintaining her reputation"],
  },
  {
    id: "finn",
    name: "Finn",
    type: "Student",
    gradeLabel: "7th-grade student",
    descriptor: "Discovery motivates Finn; environmental science and coding.",
    background: "Caucasian, both parents are teachers",
    ses: "Middle",
    tendencies: ["Asks clarifying questions", "Comfortable disagreeing calmly"],
    closeWith: ["Ben", "Daniel"],
    tensionWith: [],
    interests: ["Science", "Technology", "Community clean-up projects"],
    knows: ["What the teacher said at the start of class"],
    hiddenFromTeacher: ["He assumes adults already know what is going on"],
  },
  {
    id: "daniel",
    name: "Daniel",
    type: "Student",
    gradeLabel: "7th-grade student",
    descriptor: "Perseverance motivates Daniel; joined a regional track team.",
    background: "African American, raised by a single mother",
    ses: "Low",
    tendencies: ["Steady under pressure", "Manages time between practice and class"],
    closeWith: ["Parker", "Finn"],
    tensionWith: [],
    interests: ["PE", "Science", "Track"],
    knows: ["That practice conflicts with the extra rehearsal"],
    hiddenFromTeacher: ["He is worried about missing part of the concert"],
  },
  {
    id: "isla",
    name: "Isla",
    type: "Student",
    gradeLabel: "7th-grade student",
    descriptor: "Responsibility motivates Isla; leadership roles in school clubs.",
    background: "Caucasian, single child",
    ses: "Middle",
    tendencies: ["Self-reliant", "Prefers to solve things without adult help"],
    closeWith: ["Clara", "Ella"],
    tensionWith: [],
    interests: ["Science", "Social studies", "Community service project"],
    knows: ["How the group usually resolves disagreements"],
    hiddenFromTeacher: ["She has started avoiding group work with one peer"],
  },
];

export function getPerson(id: string) {
  return PEOPLE_LIBRARY.find((p) => p.id === id);
}
