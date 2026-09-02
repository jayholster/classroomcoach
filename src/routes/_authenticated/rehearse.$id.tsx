import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, Drawer, btn, btnPrimary, input } from "@/components/AppShell";
import {
  endRehearsal,
  flagEvent,
  getRehearsalSession,
  submitRehearsalTurn,
  type SessionEvent,
} from "@/lib/api/rehearsal.functions";
import { renderVisibleResponse } from "@/lib/spec/schema";

const FLAG_REASONS = [
  "Didn't fit the situation",
  "Revealed information too early",
  "Character felt inconsistent",
  "Possible stereotype / unsupported assumption",
  "Other",
];

export const Route = createFileRoute("/_authenticated/rehearse/$id")({
  head: () => ({
    meta: [
      { title: "Rehearsal in progress — Classroom Coach" },
      { name: "description", content: "Respond in the moment to a live simulated classroom situation." },
      { property: "og:title", content: "Rehearsal in progress — Classroom Coach" },
      { property: "og:description", content: "Type what you would actually say or do, and see the room respond." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RehearsePage,
});

function RehearsePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchSession = useServerFn(getRehearsalSession);
  const submit = useServerFn(submitRehearsalTurn);
  const finish = useServerFn(endRehearsal);
  const flag = useServerFn(flagEvent);

  const sessionQuery = useQuery({
    queryKey: ["rehearsal", id],
    queryFn: () => fetchSession({ data: { sessionId: id } }),
  });

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showState, setShowState] = useState(false);
  const [flagFor, setFlagFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionQuery.data?.events.length]);

  if (sessionQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading rehearsal…</p>
      </AppShell>
    );
  }
  if (sessionQuery.error) {
    return (
      <AppShell>
        <p className="text-sm text-destructive">{(sessionQuery.error as Error).message}</p>
      </AppShell>
    );
  }

  const data = sessionQuery.data!;
  const ended = Boolean(data.session.ended_at);

  const respond = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    const action = text.trim();
    const result = await submit({ data: { sessionId: id, action } });
    if (!result.ok) setError(result.error);
    else setText("");
    await sessionQuery.refetch();
    setBusy(false);
  };

  const end = async () => {
    await finish({ data: { sessionId: id } });
    navigate({ to: "/review/$sessionId", params: { sessionId: id } });
  };

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-primary">
                {data.spec.setting.label || data.session.scenario_title} — Rehearsal
              </h1>
              <p className="text-sm text-muted-foreground">{data.spec.practicing_role}</p>
            </div>
            <div className="flex gap-2">
              <Chip>{data.versionLabel}</Chip>
              {ended && <Chip tone="warn">Ended</Chip>}
            </div>
          </div>

          <div className="panel mt-6 divide-y divide-border">
            {data.events.map((e: SessionEvent) => (
              <div key={e.id}>
                {e.user_action && (
                  <div className="flex items-start gap-3 p-5">
                    <span className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">You</span>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-primary">{e.user_action}</p>
                  </div>
                )}
                {e.visible_response && (
                  <div className="flex items-start gap-3 p-5">
                    <button
                      title="Flag this response"
                      className="mt-0.5 text-muted-foreground hover:text-destructive"
                      onClick={() => setFlagFor(e.id)}
                    >
                      ⚑
                    </button>
                    <div>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                        {renderVisibleResponse(e.visible_response)}
                      </p>
                      {e.state_update && e.state_update.relationship_changes.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Recorded change: {e.state_update.relationship_changes.join("; ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          {!ended && (
            <div className="mt-5">
              <textarea
                className={`${input} text-base`}
                rows={4}
                value={text}
                placeholder="Type what you would say or do…"
                onChange={(e) => setText(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <button className={btnPrimary} onClick={() => void respond()} disabled={busy}>
                  {busy ? "The room responds…" : "RESPOND"}
                </button>
                <button className={btn} onClick={() => void end()} disabled={busy}>
                  END REHEARSAL
                </button>
              </div>
            </div>
          )}

          {ended && (
            <button
              className={`${btnPrimary} mt-5`}
              onClick={() => navigate({ to: "/review/$sessionId", params: { sessionId: id } })}
            >
              GO TO AFTER-ACTION REVIEW
            </button>
          )}
        </div>

        <aside className="space-y-4">
          <button className={`${btn} w-full`} onClick={() => setShowState(true)}>
            Current simulation state
          </button>
          <p className="text-xs text-muted-foreground">
            Instructor-only view. The practicing user sees only what the situation makes available.
          </p>
          <p className="text-xs text-muted-foreground">
            {data.foundationVersion}
            {data.events.find((e) => e.model_identifier)?.model_identifier
              ? ` · ${data.events.find((e) => e.model_identifier)!.model_identifier}`
              : ""}
          </p>
        </aside>
      </div>

      {showState && (
        <Drawer title="Current simulation state" onClose={() => setShowState(false)}>
          <StateList label="Active participants" items={data.state.active_participants} />
          <StateList label="Unresolved" items={data.state.unresolved} />
          <StateList label="Participation changes" items={data.state.participation} />
          <StateList label="Relationship changes" items={data.state.relationship_changes} />
          <StateList label="Revealed" items={data.state.revealed} />
          <StateList label="Still latent" items={data.state.latent} />
        </Drawer>
      )}

      {flagFor && (
        <Drawer title="Flag this response" onClose={() => setFlagFor(null)}>
          <p className="mb-4 text-xs text-muted-foreground">The simulation continues after flagging.</p>
          <textarea
            className={input}
            rows={2}
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <ul className="mt-4 space-y-2">
            {FLAG_REASONS.map((r) => (
              <li key={r}>
                <button
                  className={`${btn} w-full justify-start`}
                  onClick={async () => {
                    await flag({ data: { eventId: flagFor, sessionId: id, reason: r, note: note || undefined } });
                    setFlagFor(null);
                    setNote("");
                    await sessionQuery.refetch();
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
