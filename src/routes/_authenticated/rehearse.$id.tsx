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
import { Message, MessageContent } from "@/components/ai-elements/message";

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
    retry: false,
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
  if (sessionQuery.error || !sessionQuery.data) {
    return (
      <AppShell>
        <div className="max-w-lg space-y-3">
          <h1 className="text-lg font-semibold">This rehearsal is no longer available</h1>
          <p className="text-sm text-muted-foreground">
            {(sessionQuery.error as Error | null)?.message ??
              "The rehearsal may have been removed, or the link belongs to another account."}
          </p>
          <button type="button" className={btn} onClick={() => navigate({ to: "/rehearse" })}>
            Back to rehearsals
          </button>
        </div>
      </AppShell>
    );
  }


  const data = sessionQuery.data;
  if (!data) return null;
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

  const turnCount = data.events.filter((e: SessionEvent) => Boolean(e.user_action)).length;

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Rehearsal in progress</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                {data.spec.setting.label || data.session.scenario_title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You are the {data.spec.practicing_role} · {turnCount} {turnCount === 1 ? "turn" : "turns"} so far
              </p>
            </div>
            <div className="flex gap-2">
              <Chip>{data.versionLabel}</Chip>
              {ended && <Chip tone="warn">Ended</Chip>}
            </div>
          </div>

          <div
            className="panel mt-6 divide-y divide-border"
            role="log"
            aria-live="polite"
            aria-label="Rehearsal transcript"
          >
            {data.events.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">
                The room is waiting. Type what you would actually say or do to open the moment.
              </div>
            )}
            {data.events.map((e: SessionEvent, index: number) => (
              <div key={e.id} className="p-5 sm:p-6">
                <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Turn {index + 1}
                </p>
                {e.user_action && (
                  <Message from="user" className="max-w-[92%] gap-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your move</p>
                    <MessageContent className="mt-1 rounded-sm border border-primary/15 bg-primary/5 px-4 py-3 text-primary shadow-none">
                      <p className="whitespace-pre-line text-sm leading-relaxed">{e.user_action}</p>
                    </MessageContent>
                  </Message>
                )}
                {e.visible_response && (
                  <Message from="assistant" className="mt-5 max-w-full gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">The room responds</p>
                      <button
                        type="button"
                        title="Flag this response"
                        aria-label="Flag this response for review"
                        className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                        onClick={() => setFlagFor(e.id)}
                      >
                        Flag
                      </button>
                    </div>
                    <MessageContent className="w-full max-w-none gap-4 px-0 py-0 text-foreground">
                      <div className="space-y-4 border-l-2 border-ring/35 pl-4 sm:pl-5">
                        {e.visible_response.voices.map((voice, voiceIndex) => (
                          <div key={`${voice.name}-${voiceIndex}`}>
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{voice.name}</span>
                              {voice.cue && <span className="text-xs italic text-muted-foreground">{voice.cue}</span>}
                            </div>
                            {voice.line && <p className="mt-1 text-[0.98rem] leading-7 text-foreground">“{voice.line}”</p>}
                          </div>
                        ))}
                        {e.visible_response.observation && (
                          <div className="border-t border-border/70 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Scene beat</p>
                            <p className="mt-1 text-sm italic leading-relaxed text-muted-foreground">{e.visible_response.observation}</p>
                          </div>
                        )}
                      </div>
                      {e.state_update && e.state_update.relationship_changes.length > 0 && (
                        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                          Recorded change: {e.state_update.relationship_changes.join("; ")}
                        </p>
                      )}
                    </MessageContent>
                  </Message>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {!ended && (
            <div className="sticky bottom-0 mt-5 border-t border-border bg-background pt-4">
              <label htmlFor="rehearsal-response" className="text-sm font-medium text-foreground">
                Your response
              </label>
              <textarea
                id="rehearsal-response"
                className={`${input} mt-2 text-base`}
                rows={4}
                value={text}
                placeholder="Type what you would say or do…"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void respond();
                  }
                }}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button className={btnPrimary} onClick={() => void respond()} disabled={busy || !text.trim()}>
                  {busy ? "The room responds…" : "Respond"}
                </button>
                <button className={btn} onClick={() => void end()} disabled={busy}>
                  End rehearsal
                </button>
                <span className="text-xs text-muted-foreground">Ctrl/⌘ + Enter to send</span>
              </div>
              <p className="mt-2 pb-4 text-xs text-muted-foreground">
                Ending the rehearsal closes it for good and takes you to the after-action review.
              </p>
            </div>
          )}

          {ended && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                className={btnPrimary}
                onClick={() => navigate({ to: "/review/$sessionId", params: { sessionId: id } })}
              >
                Go to after-action review
              </button>
              <button className={btn} onClick={() => navigate({ to: "/rehearse" })}>
                Back to rehearsals
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <button className={`${btn} w-full`} onClick={() => setShowState(true)}>
            View simulation state
          </button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Instructor-only view of what the situation is tracking. The practicing user sees only what the moment makes
            available.
          </p>
          <div className="panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Provenance</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {data.foundationVersion}
              {data.events
                .slice()
                .reverse()
                .find((e) => e.model_identifier)?.model_identifier
                ? ` · ${data.events.slice().reverse().find((e) => e.model_identifier)?.model_identifier}`
                : ""}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Something feel off? Use <span className="text-foreground">Flag</span> on any response — the rehearsal keeps
            going.
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
                    await flag({ data: { eventId: flagFor, sessionId: id, reason: r, ...(note ? { note } : {}) } });
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
