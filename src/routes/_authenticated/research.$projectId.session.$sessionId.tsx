import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, Section, btn, btnPrimary, input } from "@/components/AppShell";
import { addResearchAnnotation, getResearchSession } from "@/lib/api/research.functions";
import { renderVisibleResponse, type VisibleResponse } from "@/lib/spec/schema";

export const Route = createFileRoute("/_authenticated/research/$projectId/session/$sessionId")({
  head: () => ({
    meta: [
      { title: "Event Explorer — Classroom Coach Research" },
      {
        name: "description",
        content: "Inspect an authorized rehearsal event by event, with learner actions, generated responses, and annotations.",
      },
      { property: "og:title", content: "Event Explorer — Classroom Coach Research" },
      { property: "og:description", content: "Event-level review for an authorized Classroom Coach study." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventExplorer,
});

function formatJson(value: unknown) {
  if (value === null || value === undefined) return "None recorded";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function readableResponse(value: unknown) {
  if (!value || typeof value !== "object") return "None recorded";
  const response = value as VisibleResponse;
  if (!Array.isArray(response.voices)) return formatJson(value);
  return renderVisibleResponse(response).replace("\n\nWhat do you do next?", "");
}

function EventExplorer() {
  const { projectId, sessionId } = Route.useParams();
  const getSession = useServerFn(getResearchSession);
  const addAnnotation = useServerFn(addResearchAnnotation);
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [annotationEvent, setAnnotationEvent] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["research", "session", projectId, sessionId],
    queryFn: () => getSession({ data: { projectId, sessionId } }),
  });

  const submitAnnotation = async (eventId: string) => {
    const body = drafts[eventId]?.trim();
    if (!body) return;
    setSaving(eventId);
    setMessage(null);
    try {
      await addAnnotation({ data: { projectId, sessionId, eventId, body } });
      setDrafts((current) => ({ ...current, [eventId]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["research", "session", projectId, sessionId] });
      setMessage("Annotation saved.");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  if (query.isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading event explorer…</p>
      </AppShell>
    );
  }
  if (query.error || !query.data) {
    return (
      <AppShell>
        <p role="alert" className="text-sm text-destructive">
          {(query.error as Error | null)?.message ?? "That rehearsal is unavailable."}
        </p>
      </AppShell>
    );
  }

  const { session, events, flags, annotations } = query.data;
  return (
    <AppShell>
      <Link to="/research/$projectId" params={{ projectId }} className="text-xs text-muted-foreground hover:text-foreground">
        ← Back to study
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Event Explorer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.scenarioTitle} · {session.participant} · {new Date(session.startedAt).toLocaleString()}
          </p>
        </div>
        <Chip>{session.endedAt ? "Completed" : "In progress"}</Chip>
      </div>

      <Section title="Session at a glance" description="The recorded version and foundation used for this rehearsal.">
        <dl className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Version</dt>
            <dd className="mt-1 text-foreground">{session.version?.version_label ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Foundation</dt>
            <dd className="mt-1 text-foreground">{session.version?.foundation_version ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Recorded turns</dt>
            <dd className="mt-1 text-foreground">{events.length}</dd>
          </div>
        </dl>
      </Section>

      {message && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <div className="space-y-5">
        {events.length === 0 && <p className="text-sm text-muted-foreground">No events recorded for this rehearsal.</p>}
        {events.map((event) => {
          const eventFlags = flags.filter((flag) => flag.event_id === event.id);
          const eventAnnotations = annotations.filter((annotation) => annotation.event_id === event.id);
          return (
            <article key={event.id} className="border-l-2 border-border pl-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">Turn {event.sequence}</span>
                <Chip>{event.status}</Chip>
                {eventFlags.length > 0 && <Chip tone="warn">{eventFlags.length} flag{eventFlags.length === 1 ? "" : "s"}</Chip>}
                <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-3 space-y-4">
                <section className="border-l-2 border-primary/30 pl-4">
                  <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">Observed · learner action</h2>
                  <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-foreground">{event.user_action || "No action recorded"}</p>
                </section>
                <section className="border-l-2 border-ring/40 pl-4">
                  <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">Model-generated · room response</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground">{readableResponse(event.visible_response)}</p>
                </section>
                <details className="border-t border-border pt-3 text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show state, provenance, and raw record</summary>
                  <div className="mt-4 grid gap-5 lg:grid-cols-3">
                    <div>
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">State update</h2>
                      <pre className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">{formatJson(event.state_update)}</pre>
                    </div>
                    <div>
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model record</h2>
                      <p className="mt-1 text-xs leading-relaxed text-foreground">
                        {event.model_provider ?? "Unknown provider"} · {event.model_identifier ?? "Unknown model"}<br />
                        Foundation {event.foundation_version}
                        {event.latency_ms ? ` · ${event.latency_ms} ms` : ""}
                      </p>
                    </div>
                    <div>
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Raw response</h2>
                      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground">{formatJson(event.visible_response)}</pre>
                    </div>
                  </div>
                </details>
                {(eventFlags.length > 0 || eventAnnotations.length > 0) && (
                  <section className="border-t border-border pt-3">
                    <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Annotations and flags</h2>
                    <div className="mt-2 space-y-2">
                      {eventFlags.map((flag) => (
                        <div key={`${flag.event_id}-${flag.reason}`} className="text-xs text-destructive">
                          Flag: {flag.reason}{flag.note ? ` — ${flag.note}` : ""}
                        </div>
                      ))}
                      {eventAnnotations.map((annotation) => (
                        <div key={annotation.id} className="border-l border-ring pl-3 text-sm text-foreground">
                          {annotation.body}
                          <span className="ml-2 text-xs text-muted-foreground">{new Date(annotation.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                <div>
                  <button className={btn} type="button" aria-expanded={annotationEvent === event.id} onClick={() => setAnnotationEvent((current) => current === event.id ? null : event.id)}>
                    {annotationEvent === event.id ? "Cancel annotation" : "Add note"}
                  </button>
                  {annotationEvent === event.id && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        aria-label={`Add annotation for turn ${event.sequence}`}
                        className={`${input} flex-1`}
                        placeholder="Write a note about this moment"
                        value={drafts[event.id] ?? ""}
                        onChange={(e) => setDrafts((current) => ({ ...current, [event.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submitAnnotation(event.id);
                        }}
                      />
                      <button className={btnPrimary} disabled={saving === event.id || !drafts[event.id]?.trim()} onClick={() => void submitAnnotation(event.id)}>
                        {saving === event.id ? "Saving…" : "Save note"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
