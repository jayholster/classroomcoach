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

type ChangeTag = { kind: "Relationship" | "Participation" | "Revealed" | "Unresolved" | "Resolved"; text: string };

function changeTags(update: SessionEvent["state_update"]): ChangeTag[] {
  if (!update) return [];
  return [
    ...update.relationship_changes.map((t) => ({ kind: "Relationship" as const, text: t })),
    ...update.participation_changes.map((t) => ({ kind: "Participation" as const, text: t })),
    ...update.newly_revealed.map((t) => ({ kind: "Revealed" as const, text: t })),
    ...update.new_unresolved.map((t) => ({ kind: "Unresolved" as const, text: t })),
    ...update.resolved.map((t) => ({ kind: "Resolved" as const, text: t })),
  ];
}

function ChangeList({ tags }: { tags: ChangeTag[] }) {
  if (!tags.length) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {tags.map((t) => (
        <li key={`${t.kind}-${t.text}`} className="flex flex-wrap items-baseline gap-2 text-sm text-foreground">
          <span className="shrink-0 rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t.kind}
          </span>
          <span>{t.text}</span>
        </li>
      ))}
    </ul>
  );
}

function ReviewDetail() {
  const { sessionId } = Route.useParams();
  const fetchSession = useServerFn(getRehearsalSession);
  const makeReview = useServerFn(generateReview);
  const sessionQuery = useQuery({
    queryKey: ["rehearsal", sessionId],
    queryFn: () => fetchSession({ data: { sessionId } }),
    retry: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (sessionQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading review…</p>
      </AppShell>
    );
  }
  if (sessionQuery.error || !sessionQuery.data) {
    return (
      <AppShell>
        <p role="alert" className="text-sm text-destructive">
          {(sessionQuery.error as Error | null)?.message ?? "That rehearsal is unavailable."}
        </p>
      </AppShell>
    );
  }

  const data = sessionQuery.data;
  const turns = data.events.filter((e: SessionEvent) => e.user_action);
  const consequential = turns.filter((e) => changeTags(e.state_update).length > 0);
  const review = data.session.review;

  const run = async () => {
    setBusy(true);
    setError(null);
    const result = await makeReview({ data: { sessionId } });
    if (!result.ok) setError(result.error);
    await sessionQuery.refetch();
    setBusy(false);
  };

  const summary: [string, string | number][] = [
    ["Your actions", turns.length],
    ["Moments that shifted the room", consequential.length],
    ["Flags you raised", data.flags.length],
    ["Reflection", review ? "Ready" : "Not generated"],
  ];

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-primary">
            {data.session.scenario_title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rehearsed {new Date(data.session.started_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Chip>{data.versionLabel}</Chip>
          <Chip>{data.foundationVersion}</Chip>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map(([label, value]) => (
          <div key={label} className="panel p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-primary">{value}</dd>
          </div>
        ))}
      </dl>

      <Section
        title="1 · What to take away"
        description="Written from the recorded events, never from a score."
        actions={
          <button className={review ? btn : btnPrimary} onClick={() => void run()} disabled={busy}>
            {busy ? "Building…" : review ? "Regenerate" : "Generate reflection"}
          </button>
        }
      >
        {error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {review ? (
          <div className="grid gap-6 sm:grid-cols-3">
            <List label="Strengths observed" items={review.strengths_observed} />
            <List label="Growth opportunities" items={review.growth_opportunities} />
            <List label="Possible next rehearsal" items={review.possible_next_rehearsal} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No reflection yet. Generate one to see strengths, growth opportunities, and a suggested next rehearsal.
          </p>
        )}
      </Section>

      <Section title="2 · Moments that mattered" description="Turns where something in the room actually shifted.">
        {consequential.length ? (
          <ol className="space-y-4">
            {consequential.map((e, i) => (
              <li key={e.id} className="rounded-sm border border-border p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Moment {i + 1} · your move
                </p>
                <p className="mt-1 text-base leading-relaxed text-primary">{e.user_action}</p>
                <ChangeList tags={changeTags(e.state_update)} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No recorded moment changed the relational state.</p>
        )}
      </Section>

      <Section
        title="3 · Full transcript"
        description="Every recorded turn, exactly as it happened."
        actions={
          <button className={btn} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            {showAll ? "Hide all turns" : `Show all ${data.events.length} turns`}
          </button>
        }
      >
        {showAll ? (
          <ol className="space-y-6">
            {data.events.map((e: SessionEvent) => (
              <li key={e.id} className="border-l-2 border-border pl-5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {e.user_action ? "Your move" : "Opening moment"}
                </p>
                {e.user_action && <p className="mt-1 text-base leading-relaxed text-primary">{e.user_action}</p>}
                {e.visible_response && (
                  <>
                    <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      What happened
                    </p>
                    <p className="mt-1 whitespace-pre-line text-[0.98rem] leading-7 text-foreground">
                      {renderVisibleResponse(e.visible_response).replace("\n\nWhat do you do next?", "")}
                    </p>
                  </>
                )}
                {changeTags(e.state_update).length > 0 && (
                  <>
                    <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      What changed
                    </p>
                    <ChangeList tags={changeTags(e.state_update)} />
                  </>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            The transcript is collapsed so the review opens short. Expand it to read the rehearsal turn by turn.
          </p>
        )}
      </Section>

      <Section title="4 · Where things stood at the end">
        <div className="grid gap-6 sm:grid-cols-2">
          <List label="Unresolved" items={data.state.unresolved} />
          <List label="Relationship changes" items={data.state.relationship_changes} />
          <List label="Revealed during rehearsal" items={data.state.revealed} />
          <List label="Still latent" items={data.state.latent} />
        </div>
      </Section>

      {data.flags.length > 0 && (
        <Section title="5 · Flagged moments" description="Responses you marked for review.">
          <ul className="space-y-2 text-sm text-foreground">
            {data.flags.map((f) => (
              <li key={f.id}>
                {f.reason}
                {f.note ? ` — ${f.note}` : ""} <span className="text-xs text-muted-foreground">({f.status})</span>
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
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
        {items.length ? items.map((i) => <li key={i}>{i}</li>) : <li className="text-muted-foreground">None</li>}
      </ul>
    </div>
  );
}
