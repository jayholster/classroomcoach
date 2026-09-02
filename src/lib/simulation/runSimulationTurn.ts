import type { ScenarioDraft, SimState } from "../types";

export interface TurnRequest {
  draft: ScenarioDraft;
  state: SimState;
  history: { role: "system" | "user"; text: string }[];
  userAction: string;
}

export interface TurnResult {
  text: string;
  state: SimState;
  changes: string[];
}

/** Returns true only if a model integration has been configured for this build. */
export function isAiModeAvailable(): boolean {
  return Boolean((import.meta as { env?: Record<string, string> }).env?.["VITE_SIMULATION_MODEL"]);
}

type Approach = "supportive" | "controlling" | "redirecting";

/** Internal classification only — never surfaced to the learner. */
function classify(input: string): Approach {
  const t = input.toLowerCase();
  const supportive =
    /(what happened|tell me|how are you|i hear|help me understand|are you okay|feel|listen|both of you.*share|what do you need)/.test(
      t,
    ) || t.includes("?");
  const controlling =
    /(stop it|enough|quiet|detention|hallway|sit down|because i said|knock it off|you two are|blame|your fault|stop talking)/.test(
      t,
    );
  if (controlling) return "controlling";
  if (supportive) return "supportive";
  return "redirecting";
}

function names(draft: ScenarioDraft) {
  const [a, b, c] = draft.people.map((p) => p.name);
  return { a: a ?? "Mia", b: b ?? "Kayla", c: c ?? "Grace" };
}

function push(list: string[], item: string) {
  return list.includes(item) ? list : [...list, item];
}

function drop(list: string[], item: string) {
  return list.filter((i) => i !== item);
}

export function openingTurn(draft: ScenarioDraft): { text: string; state: SimState } {
  const { a, b, c } = names(draft);
  const text = `[${a}, hurt]: "Can you stop telling everyone I'm the reason we sound bad?"
[${b}, defensive]: "I said we keep restarting because you don't know your part."
[${c}, hesitant]: "You did kind of say it yesterday too."

→ ${a} lowers her instrument. ${b} turns toward ${c}. Several students have stopped playing.

What do you do next?`;
  return {
    text,
    state: {
      activeParticipants: draft.people.map((p) => p.name),
      unresolved: [`Peer blame between ${a} and ${b}`, "Rehearsal has stopped"],
      participation: ["Ensemble has stopped playing"],
      relationshipChanges: [],
      revealed: draft.information.filter((i) => i.state === "visible").map((i) => i.text),
      latent: draft.information.filter((i) => i.state === "latent").map((i) => i.text),
    },
  };
}

/** Deterministic local demo engine — used whenever no model is configured. */
function demoTurn(req: TurnRequest): TurnResult {
  const { a, b, c } = names(req.draft);
  const approach = classify(req.userAction);
  const turnIndex = req.history.filter((h) => h.role === "user").length;
  let state: SimState = {
    ...req.state,
    unresolved: [...req.state.unresolved],
    participation: [...req.state.participation],
    relationshipChanges: [...req.state.relationshipChanges],
    revealed: [...req.state.revealed],
    latent: [...req.state.latent],
  };
  const changes: string[] = [];
  let text = "";

  if (approach === "supportive") {
    state.relationshipChanges = push(state.relationshipChanges, `${a} → Teacher: cautiously more open`);
    changes.push(`${a} → Teacher: cautiously more open`);
    if (turnIndex >= 1 && state.latent.some((l) => l.includes("entrance"))) {
      const item = state.latent.find((l) => l.includes("entrance"))!;
      state.latent = drop(state.latent, item);
      state.revealed = push(state.revealed, item);
      changes.push(`Revealed: ${item}`);
      text = `[${c}, quieter]: "I mess up that entrance too. I just don't say anything."
[${a}, surprised]: "Wait — you do?"
[${b}, slower]: "...Okay. So maybe it's not just her."

→ ${c} looks at her music instead of at anyone. Two students in the back sit back up.

What do you do next?`;
    } else {
      text = `[${a}, quieter]: "It's just — every time we stop, everyone looks at me."
[${b}, less sharp]: "I wasn't trying to make it a whole thing."
[${c}, careful]: "Can we just try it again?"

→ ${a} keeps her instrument down but turns toward you. The room noise drops.

What do you do next?`;
    }
    state.participation = push(state.participation, "Most students re-oriented toward the podium");
  } else if (approach === "controlling") {
    state.relationshipChanges = push(state.relationshipChanges, `${a} → Teacher: guarded`);
    state.relationshipChanges = push(state.relationshipChanges, `${b} → ${c}: more tense`);
    state.unresolved = push(state.unresolved, `${a} has not been heard about the blame`);
    changes.push(`${a} → Teacher: guarded`, `${b} → ${c}: more tense`);
    text = `[${a}, flat]: "Fine."
[${b}, under her breath]: "See, now we're all in trouble because of it."
[${c}, barely audible]: "Sorry."

→ ${a} lifts her instrument without looking up. ${b} shifts her chair away from ${c}. The section is quiet, but nobody has started playing.

What do you do next?`;
    state.participation = push(state.participation, `${a} participating minimally`);
  } else {
    state.unresolved = push(state.unresolved, "The disagreement has not been addressed directly");
    changes.push("Rehearsal resumed with the disagreement unaddressed");
    text = `[${b}, moving on]: "From measure forty-one?"
[${a}, tight]: "Whatever, yeah."
[${c}, glancing at ${a}]: "...Forty-one."

→ Instruments come up unevenly. ${a} plays, but she does not look at ${b} again.

What do you do next?`;
    state.participation = push(state.participation, "Playing resumed unevenly");
  }

  if (req.draft.conditions.allowComplications && turnIndex >= 2) {
    const complication = "A student near the back asks how long until the concert.";
    if (!state.unresolved.includes(complication)) {
      state.unresolved = push(state.unresolved, complication);
      changes.push("New complication: time pressure raised by another student");
      text = text.replace("What do you do next?", `[A voice from the back]: "Is this on the concert?"

What do you do next?`);
    }
  }

  return { text, state, changes };
}

/**
 * Single service abstraction for advancing a simulation.
 * When a model integration is configured it sends the core instructions,
 * profile/context excerpts, published scenario specification, explicit state,
 * interaction history and the new user action, and returns the visible
 * response plus a structured state update. Otherwise it falls back to the
 * deterministic local demo engine so the prototype runs without an API key.
 */
export async function runSimulationTurn(req: TurnRequest): Promise<TurnResult> {
  if (isAiModeAvailable()) {
    try {
      const res = await fetch("/api/simulation-turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) return (await res.json()) as TurnResult;
    } catch {
      /* fall through to demo mode */
    }
  }
  return demoTurn(req);
}
