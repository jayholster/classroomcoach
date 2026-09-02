import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Chip, Section, btn } from "@/components/AppShell";
import { loadSessions } from "@/lib/store";
import type { Session, Turn } from "@/lib/types";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "After-Action Review — Classroom Coach" },
      {
        name: "description",
        content: "Review what happened during a rehearsal, what changed relationally, and what to practice next.",
      },
      { property: "og:title", content: "After-Action Review — Classroom Coach" },
      { property: "og:description", content: "Brief, relational, non-graded review of a rehearsal." },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moment, setMoment] = useState<string | null>(null);

  useEffect(() => {
    const all = loadSessions();
    setSessions(all);
    setSelectedId(all[0]?.id ?? null);
  }, []);

  const session = sessions.find((s) => s.id === selectedId) ?? null;

  if (!session) {
    return (
      <AppShell>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">After-Action Review</h1>
        <p className="mt-3 text-sm text-muted-foreground">No rehearsals recorded yet.</p>
      </AppShell>
    );
  }

  const systemTurns = session.turns.filter((t) => t.role === "system" && t.stateChanges);
  const selected = systemTurns.find((t) => t.id === moment) ?? systemTurns[systemTurns.length - 1] ?? null;
  const userTurnBefore = (turn: Turn | null) => {
    if (!turn) return null;
    const idx = session.turns.findIndex((t) => t.id === turn.id);
    return session.turns[idx - 1] ?? null;
  };
  const action = userTurnBefore(selected);
  const supportive = session.state.relationshipChanges.some((c) => c.includes("more open"));
  const guarded = session.state.relationshipChanges.some((c) => c.includes("guarded"));

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">After-Action Review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.simulationTitle} · started {new Date(session.startedAt).toLocaleString()}
          </p>
        </div>
        {sessions.length > 1 && (
          <select
            className="rounded-sm border border-input bg-background px-2 py-1.5 text-sm"
            value={session.id}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.simulationTitle} — {new Date(s.startedAt).toLocaleString()}
              </option>
            ))}
          </select>
        )}
      </div>

      <Section title="Timeline" description="Select a consequential moment.">
        <ol className="space-y-3">
          {session.turns.map((t, i) => (
            <li key={t.id} className="flex items-start gap-3 border-b border-border pb-3">
              <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                {i === 0 ? "Opening" : t.role === "user" ? "Your action" : "Response"}
              </span>
              <div className="flex-1">
                <p className="whitespace-pre-line text-sm text-foreground">{t.text}</p>
                {t.stateChanges?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.stateChanges.map((c) => (
                      <Chip key={c} tone="accent">
                        {c}
                      </Chip>
                    ))}
                  </div>
                ) : null}
                {session.flags.some((f) => f.turnId === t.id) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {session.flags
                      .filter((f) => f.turnId === t.id)
                      .map((f, j) => (
                        <Chip key={j} tone="warn">
                          Flagged: {f.reason}
                        </Chip>
                      ))}
                  </div>
                )}
              </div>
              {t.role === "system" && t.stateChanges && (
                <button className={btn} onClick={() => setMoment(t.id)}>
                  Examine
                </button>
              )}
            </li>
          ))}
        </ol>
      </Section>

      {selected && (
        <Section title="Consequential moment">
          <div className="grid gap-5 sm:grid-cols-2">
            <Block label="Before" items={selected.stateBefore?.unresolved ?? []} />
            <Block label="Your action" items={action ? [action.text] : []} />
            <Block label="What happened" items={[selected.text]} />
            <Block label="What changed" items={selected.stateChanges ?? []} />
          </div>
        </Section>
      )}

      <Section title="Reflection">
        <div className="grid gap-6 sm:grid-cols-3 text-sm">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Strengths observed</h3>
            <p className="mt-2 text-foreground">
              {supportive
                ? "You stayed with the student who had been named publicly, and she turned back toward you."
                : "You kept rehearsal moving and did not escalate the exchange."}
            </p>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Growth opportunities</h3>
            <p className="mt-2 text-foreground">
              {guarded
                ? "The disagreement closed rather than resolved; two students left the exchange more guarded than they entered it."
                : session.state.latent.length
                  ? "Information the room was holding stayed hidden — including a peer having the same difficulty."
                  : "Consider how the students who did not speak experienced the exchange."}
            </p>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Possible next rehearsal</h3>
            <p className="mt-2 text-foreground">
              Same ensemble, one day later, with the section still uneven.
            </p>
          </div>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          There was no single correct response. This review records what changed relationally, not a score.
        </p>
      </Section>
    </AppShell>
  );
}

function Block({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="panel bg-secondary/40 p-4">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground">{label}</h3>
      <ul className="mt-2 space-y-1 text-sm text-foreground">
        {items.length ? (
          items.map((i) => (
            <li key={i} className="whitespace-pre-line">
              {i}
            </li>
          ))
        ) : (
          <li className="text-muted-foreground">None recorded</li>
        )}
      </ul>
    </div>
  );
}
