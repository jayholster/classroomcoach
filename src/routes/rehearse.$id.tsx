import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, Chip, btn, btnPrimary, input } from "@/components/AppShell";
import { Drawer } from "./design.$id";
import { uid } from "@/lib/derive";
import { loadSimulations, saveSession } from "@/lib/store";
import { isAiModeAvailable, openingTurn, runSimulationTurn } from "@/lib/simulation/runSimulationTurn";
import type { Session, SimState, Simulation, Turn } from "@/lib/types";

const FLAG_REASONS = [
  "Didn't fit the situation",
  "Revealed information too early",
  "Character felt inconsistent",
  "Possible stereotype / unsupported assumption",
  "Other",
];

export const Route = createFileRoute("/rehearse/$id")({
  head: () => ({
    meta: [
      { title: "Rehearsal — Classroom Coach" },
      { name: "description", content: "Respond in the moment to a live simulated classroom situation." },
      { property: "og:title", content: "Rehearsal — Classroom Coach" },
      { property: "og:description", content: "Type what you would actually say or do, and see the room respond." },
    ],
  }),
  component: RehearsePage,
});

function RehearsePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [sim, setSim] = useState<Simulation | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showState, setShowState] = useState(false);
  const [flagFor, setFlagFor] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = loadSimulations().find((s) => s.id === id) ?? null;
    setSim(found);
    if (found) start(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.turns.length]);

  const start = (s: Simulation) => {
    const opening = openingTurn(s.draft);
    const newSession: Session = {
      id: uid(),
      simulationId: s.id,
      simulationTitle: s.title,
      startedAt: new Date().toISOString(),
      turns: [{ id: uid(), role: "system", text: opening.text }],
      state: opening.state,
      flags: [],
    };
    setSession(newSession);
    saveSession(newSession);
  };

  const submit = async () => {
    if (!sim || !session || !text.trim() || busy) return;
    setBusy(true);
    const userTurn: Turn = { id: uid(), role: "user", text: text.trim() };
    const stateBefore: SimState = session.state;
    const result = await runSimulationTurn({
      draft: sim.draft,
      state: session.state,
      history: session.turns.map((t) => ({ role: t.role, text: t.text })),
      userAction: text.trim(),
    });
    const systemTurn: Turn = {
      id: uid(),
      role: "system",
      text: result.text,
      stateChanges: result.changes,
      stateBefore,
    };
    const next: Session = {
      ...session,
      turns: [...session.turns, userTurn, systemTurn],
      state: result.state,
    };
    setSession(next);
    saveSession(next);
    setText("");
    setBusy(false);
  };

  const end = () => {
    if (!session) return;
    const ended = { ...session, endedAt: new Date().toISOString() };
    saveSession(ended);
    navigate({ to: "/review" });
  };

  if (!sim || !session) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading rehearsal…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-primary">
                {sim.setting || sim.title} — Rehearsal
              </h1>
              <p className="text-sm text-muted-foreground">{sim.draft.practicingRole}</p>
            </div>
            <Chip>{isAiModeAvailable() ? "Model mode" : "Demo mode"}</Chip>
          </div>

          <div className="panel mt-6 divide-y divide-border">
            {session.turns.map((t) => (
              <div key={t.id} className="flex items-start gap-3 p-5">
                {t.role === "system" ? (
                  <button
                    title="Flag this response"
                    className="mt-0.5 text-muted-foreground hover:text-destructive"
                    onClick={() => setFlagFor(t.id)}
                  >
                    ⚑
                  </button>
                ) : (
                  <span className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">You</span>
                )}
                <p
                  className={`whitespace-pre-line text-sm leading-relaxed ${
                    t.role === "system" ? "text-foreground" : "text-primary"
                  }`}
                >
                  {t.text}
                </p>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="mt-5">
            <textarea
              className={`${input} text-base`}
              rows={4}
              value={text}
              placeholder="Type what you would say or do…"
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button className={btnPrimary} onClick={() => void submit()} disabled={busy}>
                {busy ? "…" : "Respond"}
              </button>
              <button className={btn} onClick={() => start(sim)}>
                Restart
              </button>
              <button className={btn} onClick={end}>
                End rehearsal
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <button className={`${btn} w-full`} onClick={() => setShowState(true)}>
            Current simulation state
          </button>
          <p className="text-xs text-muted-foreground">
            Instructor-only view. The practicing user sees only what the situation makes available.
          </p>
        </aside>
      </div>

      {showState && (
        <Drawer title="Current simulation state" onClose={() => setShowState(false)}>
          <StateList label="Active participants" items={session.state.activeParticipants} />
          <StateList label="Unresolved" items={session.state.unresolved} />
          <StateList label="Participation changes" items={session.state.participation} />
          <StateList label="Relationship changes" items={session.state.relationshipChanges} />
          <StateList label="Revealed" items={session.state.revealed} />
          <StateList label="Still latent" items={session.state.latent} />
        </Drawer>
      )}

      {flagFor && (
        <Drawer title="Flag this response" onClose={() => setFlagFor(null)}>
          <p className="mb-4 text-xs text-muted-foreground">The simulation continues after flagging.</p>
          <ul className="space-y-2">
            {FLAG_REASONS.map((r) => (
              <li key={r}>
                <button
                  className={`${btn} w-full justify-start`}
                  onClick={() => {
                    const next = { ...session, flags: [...session.flags, { turnId: flagFor, reason: r }] };
                    setSession(next);
                    saveSession(next);
                    setFlagFor(null);
                  }}
                >
                  {r}
                </button>
              </li>
            ))}
          </ul>
        </Drawer>
      )}
    </AppShell>
  );
}

function StateList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mb-4">
      <h4 className="text-xs uppercase tracking-wide text-muted-foreground">{label}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
        {items.length ? items.map((i) => <li key={i}>{i}</li>) : <li className="text-muted-foreground">None</li>}
      </ul>
    </div>
  );
}
