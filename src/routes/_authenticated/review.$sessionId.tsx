import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, Section, btn, btnPrimary } from "@/components/AppShell";
import { getRehearsalSession, type SessionEvent } from "@/lib/api/rehearsal.functions";
import { generateReview } from "@/lib/api/review.functions";
import { renderVisibleResponse } from "@/lib/spec/schema";

export const Route = createFileRoute("/_authenticated/review/$sessionId")({
  head: () => ({
    meta: [
      { title: "Rehearsal review — Classroom Coach" },
      { name: "description", content: "What happened, what changed, and what to practise next." },
      { property: "og:title", content: "Rehearsal review — Classroom Coach" },
      { property: "og:description", content: "An evidence-based reconstruction of a recorded rehearsal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewDetail,
});

function ReviewDetail() {
  const { sessionId } = Route.useParams();
  const fetchSession = useServerFn(getRehearsalSession);
  const makeReview = useServerFn(generateReview);
  const sessionQuery = useQuery({
    queryKey: ["rehearsal", sessionId],
    queryFn: () => fetchSession({ data: { sessionId } }),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sessionQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading review…</p>
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
  const turns = data.events.filter((e: SessionEvent) => e.user_action);
  const consequential = turns.filter(
    (e) =>
      (e.state_update?.relationship_changes.length ?? 0) > 0 ||
      (e.state_update?.newly_revealed.length ?? 0) > 0 ||
      (e.state_update?.new_unresolved.length ?? 0) > 0,
  );
  const review = data.session.review;

  const run = async () => {
    setBusy(true);
    setError(null);
    const result = await makeReview({ data: { sessionId } });
    if (!result.ok) setError(result.error);
    await sessionQuery.refetch();
    setBusy(false);
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">{data.session.scenario_title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(data.session.started_at).toLocaleString()} · {turns.length} educator action
            {turns.length === 1 ? "" : "s"} recorded
          </p>
        </div>
        <div className="flex gap-2">
          <Chip>{data.versionLabel}</Chip>
          <Chip>{data.foundationVersion}</Chip>
        </div>
      </div>

      <Section title="What happened" description="Reconstructed from the recorded event log.">
        <ol className="space-y-5">
          {data.events.map((e: SessionEvent) => (
            <li key={e.id} className="border-l-2 border-border pl-4">
              {e.user_action ? (
                <p className="text-sm text-primary">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">You: </span>
                  {e.user_action}
                </p>
              ) : (
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Opening moment</p>
              )}
              {e.visible_response && (
                <p className="mt-2 whitespace-pre-line text-sm text-foreground">
                  {renderVisibleResponse(e.visible_response).replace("\n\nWhat do you do next?", "")}
                </p>
              )}
              {e.state_update && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {[
                    ...e.state_update.relationship_changes,
                    ...e.state_update.participation_changes,
                    ...e.state_update.newly_revealed.map((r) => `Revealed: ${r}`),
                    ...e.state_update.new_unresolved.map((u) => `Left unresolved: ${u}`),
                    ...e.state_update.resolved.map((r) => `Resolved: ${r}`),
                  ].map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Consequential moments"
        description="Turns where something in the room actually shifted."
      >
        {consequential.length ? (
          <ul className="space-y-4">
            {consequential.map((e) => (
              <li key={e.id} className="panel p-4">
                <p className="text-sm text-primary">{e.user_action}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {[
                    ...(e.state_update?.relationship_changes ?? []),
                    ...(e.state_update?.newly_revealed.map((r) => `Revealed: ${r}`) ?? []),
                    ...(e.state_update?.new_unresolved.map((u) => `New: ${u}`) ?? []),
                  ].map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No recorded moment changed the relational state.</p>
        )}
      </Section>

      <Section title="Where things stood at the end">
        <div className="grid gap-6 sm:grid-cols-2">
          <List label="Unresolved" items={data.state.unresolved} />
          <List label="Relationship changes" items={data.state.relationship_changes} />
          <List label="Revealed during rehearsal" items={data.state.revealed} />
          <List label="Still latent" items={data.state.latent} />
        </div>
      </Section>

      <Section
        title="Reflection"
        description="Generated from the recorded events, not from a score."
        actions={
          <button className={review ? btn : btnPrimary} onClick={() => void run()} disabled={busy}>
            {busy ? "Building review…" : review ? "Regenerate" : "GENERATE REVIEW"}
          </button>
        }
      >
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {review ? (
          <div className="grid gap-6 sm:grid-cols-3">
            <List label="Strengths observed" items={review.strengths_observed} />
            <List label="Growth opportunities" items={review.growth_opportunities} />
            <List label="Possible next rehearsal" items={review.possible_next_rehearsal} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No reflection has been generated for this rehearsal yet.</p>
        )}
      </Section>

      {data.flags.length > 0 && (
        <Section title="Flagged moments">
          <ul className="space-y-2 text-sm text-foreground">
            {data.flags.map((f) => (
              <li key={f.id}>
                {f.reason}
                {f.note ? ` — ${f.note}` : ""}{" "}
                <span className="text-xs text-muted-foreground">({f.status})</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </AppShell>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wide text-muted-foreground">{label}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
        {items.length ? items.map((i) => <li key={i}>{i}</li>) : <li className="text-muted-foreground">None</li>}
      </ul>
    </div>
  );
}
