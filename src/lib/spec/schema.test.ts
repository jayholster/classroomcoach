import { describe, expect, it } from "vitest";

import { ScenarioSpecSchema, SimStateSchema, TurnOutputSchema, applyStateUpdate, renderVisibleResponse } from "./schema";

const baseState = SimStateSchema.parse({
  active_participants: ["Mia", "Ben"],
  unresolved: ["Mia accused Ben in front of the ensemble"],
  participation: [],
  relationship_changes: [],
  revealed: ["Ben missed two rehearsals"],
  latent: ["Ben is covering a shift for his family"],
});

describe("applyStateUpdate", () => {
  it("moves resolved items out of the unresolved list", () => {
    const next = applyStateUpdate(baseState, {
      relationship_changes: [],
      participation_changes: [],
      newly_revealed: [],
      resolved: ["Mia accused Ben in front of the ensemble"],
      new_unresolved: [],
    });
    expect(next.unresolved).toEqual([]);
  });

  it("accumulates newly revealed information without duplicating it", () => {
    const once = applyStateUpdate(baseState, {
      relationship_changes: [],
      participation_changes: [],
      newly_revealed: ["Ben is covering a shift for his family"],
      resolved: [],
      new_unresolved: [],
    });
    const twice = applyStateUpdate(once, {
      relationship_changes: [],
      participation_changes: [],
      newly_revealed: ["Ben is covering a shift for his family"],
      resolved: [],
      new_unresolved: [],
    });
    expect(twice.revealed.filter((r) => r.includes("covering a shift"))).toHaveLength(1);
  });

  it("keeps previously unresolved items that were not resolved", () => {
    const next = applyStateUpdate(baseState, {
      relationship_changes: [],
      participation_changes: [],
      newly_revealed: [],
      resolved: [],
      new_unresolved: ["Ben has gone quiet"],
    });
    expect(next.unresolved).toContain("Mia accused Ben in front of the ensemble");
    expect(next.unresolved).toContain("Ben has gone quiet");
  });
});

describe("TurnOutputSchema", () => {
  it("rejects a response that is missing the visible response", () => {
    expect(() => TurnOutputSchema.parse({ state_update: {} })).toThrow();
  });

  it("accepts a well-formed turn", () => {
    const parsed = TurnOutputSchema.parse({
      visible_response: {
        observation: "The room goes quiet.",
        voices: [{ name: "Ben", cue: "quietly", line: "I was working." }],
      },
      state_update: { relationship_changes: ["Ben is slightly more open"] },
    });
    expect(parsed.visible_response.voices[0]?.name).toBe("Ben");
  });
});

describe("renderVisibleResponse", () => {
  it("does not repeat the closing prompt when the model already included it", () => {
    const text = renderVisibleResponse({
      observation: "Ben looks down. What do you do next?",
      voices: [{ name: "Ben", cue: "flatly", line: "Nothing." }],
    });
    expect(text.match(/What do you do next\?/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });
});

describe("ScenarioSpecSchema", () => {
  it("rejects output that is not a scenario at all", () => {
    expect(() => ScenarioSpecSchema.parse("a middle school conflict")).toThrow();
  });
});
