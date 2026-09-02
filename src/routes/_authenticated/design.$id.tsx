import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AppShell,
  Chip,
  DetailList,
  Drawer,
  Section,
  SourceChips,
  btn,
  btnPrimary,
  input,
} from "@/components/AppShell";
import { FoundationPanel } from "@/components/FoundationPanel";
import { getScenario, listPeopleProfiles, publishVersion, saveDraftSpec } from "@/lib/api/scenarios.functions";
import { generateStructuredScenario } from "@/lib/api/generate.functions";
import type { Participant, ScenarioSpec } from "@/lib/spec/schema";

export const Route = createFileRoute("/_authenticated/design/$id")({
  head: () => ({
    meta: [
      { title: "Review the simulation Classroom Coach built" },
      {
        name: "description",
        content:
          "Review and adjust the people, relationships, information, and conditions Classroom Coach derived for this simulation.",
      },
      { property: "og:title", content: "Review the simulation Classroom Coach built" },
      {
        property: "og:description",
        content: "Educator-controlled situation on top of an expert-designed simulation foundation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DesignReview,
});

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function DesignReview() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchScenario = useServerFn(getScenario);
  const fetchPeople = useServerFn(listPeopleProfiles);
  const generate = useServerFn(generateStructuredScenario);
  const saveSpec = useServerFn(saveDraftSpec);
  const publish = useServerFn(publishVersion);

  const scenarioQuery = useQuery({ queryKey: ["scenario", id], queryFn: () => fetchScenario({ data: { id } }) });
  const peopleQuery = useQuery({ queryKey: ["people"], queryFn: () => fetchPeople() });

  const [spec, setSpec] = useState<ScenarioSpec | null>(null);
  const [openPerson, setOpenPerson] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [why, setWhy] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "generate" | "save" | "publish">(null);
  const [viewMode, setViewMode] = useState<"simple" | "advanced">("simple");
  const [autosaveStatus, setAutosaveStatus] = useState<string | null>(null);
  const lastSavedSpecRef = useRef<string | null>(null);

  useEffect(() => {
    const loaded = scenarioQuery.data?.scenario.draft_spec ?? null;
    if (loaded) {
      setSpec(loaded);
      lastSavedSpecRef.current = JSON.stringify(loaded);
    }
  }, [scenarioQuery.data]);

  useEffect(() => {
    if (!spec) return;
    const serialized = JSON.stringify(spec);
    if (lastSavedSpecRef.current === serialized) return;
    const timer = window.setTimeout(async () => {
      setAutosaveStatus("Saving changes…");
      try {
        await saveSpec({ data: { id, spec } });
        lastSavedSpecRef.current = serialized;
        setAutosaveStatus("All changes saved");
      } catch (err) {
        setAutosaveStatus(null);
        setError((err as Error).message);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [id, saveSpec, spec]);

  if (scenarioQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading simulation…</p>
      </AppShell>
    );
  }
  if (scenarioQuery.error) {
    return (
      <AppShell>
        <p className="text-sm text-destructive">{(scenarioQuery.error as Error).message}</p>
      </AppShell>
    );
  }

  const data = scenarioQuery.data!;
  const documents = data.documents;
  const fileNames = documents.filter((d) => d.status === "Ready").map((d) => d.file_name);

  const runGeneration = async () => {
    setBusy("generate");
    setError(null);
    setNotice(null);
    const result = await generate({ data: { scenarioId: id } });
    if (result.ok) {
      setSpec(result.spec);
      setNotice(`Scenario derived with ${result.model}.`);
    } else {
      setError(result.error);
    }
    await scenarioQuery.refetch();
    setBusy(null);
  };

  const save = async () => {
    if (!spec) return;
    setBusy("save");
    setError(null);
    try {
      await saveSpec({ data: { id, spec } });
      lastSavedSpecRef.current = JSON.stringify(spec);
      setAutosaveStatus("All changes saved");
      setNotice("Draft saved.");
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(null);
  };

  const publishNow = async () => {
    if (!spec) return;
    setBusy("publish");
    setError(null);
    try {
      await saveSpec({ data: { id, spec } });
      const result = await publish({ data: { id } });
      setNotice(`Published ${result.versionLabel}. This version is now frozen for rehearsal.`);
      await scenarioQuery.refetch();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(null);
  };

  const setConditions = (patch: Partial<ScenarioSpec["conditions"]>) =>
    setSpec((s) => (s ? { ...s, conditions: { ...s.conditions, ...patch } } : s));

  const person = spec?.participants.find((p) => p.id === openPerson) ?? null;

  const swapPerson = (targetId: string, profile: NonNullable<typeof peopleQuery.data>[number]) => {
    setSpec((s) =>
      s
        ? {
            ...s,
            participants: s.participants.map((p) =>
              p.id === targetId
                ? ({
                    id: p.id,
                    profile_source_id: profile.key,
                    name: profile.name,
                    role: profile.participant_type,
                    scenario_relevant_background: profile.descriptor,
                    current_goal: p.current_goal,
                    current_concern: p.current_concern,
                    known_information: profile.knows,
                    latent_information: profile.hidden_from_teacher,
                    provenance: ["Educator selection", `People Library: ${profile.key}`],
                  } satisfies Participant)
                : p,
            ),
          }
        : s,
    );
    setSwapFor(null);
    setOpenPerson(null);
  };

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Review the simulation Classroom Coach built
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Built from your stated teaching purpose{fileNames.length ? ", your local context documents," : ""} and the
            Classroom Coach foundation. Adjust anything that does not fit your setting.
          </p>

          {data.scenario.generation_error && (
            <p className="mt-4 rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {data.scenario.generation_error}
            </p>
          )}

          {!spec && (
            <div className="panel mt-6 p-6">
              <h2 className="text-sm font-medium text-foreground">No scenario has been derived yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Classroom Coach will use your purpose, your uploaded context and the foundation resources to build a
                structured specification you can review.
              </p>
              <button className={`${btnPrimary} mt-4`} onClick={() => void runGeneration()} disabled={busy !== null}>
                {busy === "generate" ? "Deriving scenario…" : "DERIVE SCENARIO"}
              </button>
            </div>
          )}

          {spec && (
            <>
              <Section
                title="Purpose"
                actions={
                  <button className={btn} onClick={() => void runGeneration()} disabled={busy !== null}>
                    {busy === "generate" ? "Regenerating…" : "Regenerate"}
                  </button>
                }
              >
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Practice goal</label>
                <textarea
                  className={`${input} mt-1`}
                  rows={2}
                  value={spec.practice_goal}
                  onChange={(e) => setSpec({ ...spec, practice_goal: e.target.value })}
                />
                <label className="mt-4 block text-xs uppercase tracking-wide text-muted-foreground">
                  Practicing role
                </label>
                <input
                  className={`${input} mt-1`}
                  value={spec.practicing_role}
                  onChange={(e) => setSpec({ ...spec, practicing_role: e.target.value })}
                />
                <div className="mt-4">
                  <SourceChips sources={["Core Simulation Instructions", ...fileNames]} />
                </div>
              </Section>

              <Section title="Setting">
                <input
                  className={input}
                  value={spec.setting.label}
                  onChange={(e) => setSpec({ ...spec, setting: { ...spec.setting, label: e.target.value } })}
                />
                <textarea
                  className={`${input} mt-2`}
                  rows={2}
                  value={spec.setting.description}
                  onChange={(e) => setSpec({ ...spec, setting: { ...spec.setting, description: e.target.value } })}
                />
              </Section>

              <Section
                title="Simulated people"
                description="Drawn from the People Library. Select a person to see the scenario-relevant information."
              >
                <ul className="divide-y divide-border border-t border-border">
                  {spec.participants.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                      <button className="text-left" onClick={() => setOpenPerson(p.id)}>
                        <div className="text-sm font-medium text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.role}</div>
                        <div className="mt-1">
                          <SourceChips sources={p.provenance} />
                        </div>
                      </button>
                      <div className="flex gap-2">
                        <button className={btn} onClick={() => setWhy(p.provenance)}>
                          Why is this here?
                        </button>
                        <button className={btn} onClick={() => setSwapFor(p.id)}>
                          Swap person
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>

              {viewMode === "advanced" && (
              <Section
                title="Relationships & tensions"
                description="Situational only. Adjusting these does not change the person's underlying profile."
                actions={
                  <button
                    className={btn}
                    onClick={() =>
                      setSpec({
                        ...spec,
                        relationships: [
                          ...spec.relationships,
                          { id: uid(), between: ["", ""], nature: "", tension: "", provenance: ["Educator"] },
                        ],
                      })
                    }
                  >
                    Add situational relationship
                  </button>
                }
              >
                <ul className="space-y-3">
                  {spec.relationships.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2">
                      <input
                        className={`${input} w-32!`}
                        value={r.between[0] ?? ""}
                        onChange={(e) =>
                          setSpec({
                            ...spec,
                            relationships: spec.relationships.map((x) =>
                              x.id === r.id ? { ...x, between: [e.target.value, x.between[1] ?? ""] } : x,
                            ),
                          })
                        }
                      />
                      <span className="text-muted-foreground">↔</span>
                      <input
                        className={`${input} w-32!`}
                        value={r.between[1] ?? ""}
                        onChange={(e) =>
                          setSpec({
                            ...spec,
                            relationships: spec.relationships.map((x) =>
                              x.id === r.id ? { ...x, between: [x.between[0] ?? "", e.target.value] } : x,
                            ),
                          })
                        }
                      />
                      <input
                        className={`${input} w-44!`}
                        value={r.nature}
                        onChange={(e) =>
                          setSpec({
                            ...spec,
                            relationships: spec.relationships.map((x) =>
                              x.id === r.id ? { ...x, nature: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <input
                        className={`${input} w-44!`}
                        value={r.tension}
                        onChange={(e) =>
                          setSpec({
                            ...spec,
                            relationships: spec.relationships.map((x) =>
                              x.id === r.id ? { ...x, tension: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <button
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setSpec({ ...spec, relationships: spec.relationships.filter((x) => x.id !== r.id) })
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
              )}

              {viewMode === "advanced" && (
              <Section
                title="What is known / hidden"
                description="Latent information can emerge through interaction but should not be revealed before the situation makes it available."
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  {(["visible", "latent"] as const).map((state) => (
                    <div key={state}>
                      <h3 className="text-xs uppercase tracking-wide text-muted-foreground">
                        {state === "visible" ? "Visible at start" : "Latent / may emerge"}
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {spec.information_state[state].map((text) => (
                          <li key={text} className="flex items-start gap-2 border-b border-border pb-2">
                            <span className="flex-1 text-sm text-foreground">{text}</span>
                            <button
                              className="text-xs text-muted-foreground hover:text-primary"
                              onClick={() => {
                                const other = state === "visible" ? "latent" : "visible";
                                setSpec({
                                  ...spec,
                                  information_state: {
                                    ...spec.information_state,
                                    [state]: spec.information_state[state].filter((t) => t !== text),
                                    [other]: [...spec.information_state[other], text],
                                  },
                                });
                              }}
                            >
                              {state === "visible" ? "→ Latent" : "→ Visible"}
                            </button>
                            <button
                              className="text-xs text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setSpec({
                                  ...spec,
                                  information_state: {
                                    ...spec.information_state,
                                    [state]: spec.information_state[state].filter((t) => t !== text),
                                  },
                                })
                              }
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                      <AddItem
                        onAdd={(text) =>
                          setSpec({
                            ...spec,
                            information_state: {
                              ...spec.information_state,
                              [state]: [...spec.information_state[state], text],
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Simulation conditions">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Starting moment</label>
                <textarea
                  className={`${input} mt-1`}
                  rows={2}
                  value={spec.conditions.starting_moment}
                  onChange={(e) => setConditions({ starting_moment: e.target.value })}
                />

                <div className="mt-5">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">
                    What should make this difficult?
                  </label>
                  <TagEditor
                    tags={spec.conditions.difficulty_tags}
                    onChange={(difficulty_tags) => setConditions({ difficulty_tags })}
                  />
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Interaction intensity
                    </label>
                    <select
                      className={`${input} mt-1`}
                      value={spec.conditions.intensity}
                      onChange={(e) => setConditions({ intensity: e.target.value })}
                    >
                      <option>Low</option>
                      <option>Moderate</option>
                      <option>High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">Pacing</label>
                    <select
                      className={`${input} mt-1`}
                      value={spec.conditions.pacing}
                      onChange={(e) => setConditions({ pacing: e.target.value })}
                    >
                      <option>Room to respond</option>
                      <option>Some urgency</option>
                      <option>High urgency</option>
                    </select>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {(
                    [
                      ["allow_improvement", "Allow relationships to improve"],
                      ["allow_deterioration", "Allow relationships to deteriorate"],
                      ["allow_complications", "Allow new complications to emerge"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={spec.conditions[key]}
                        onChange={(e) => setConditions({ [key]: e.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="mt-5">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Reflection focus</label>
                  <TagEditor
                    tags={spec.conditions.reflection_focus}
                    onChange={(reflection_focus) => setConditions({ reflection_focus })}
                  />
                </div>

                <div className="mt-6">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Boundaries</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Derived from the Classroom Coach foundation. Normally left in place.
                  </p>
                  {spec.conditions.boundaries.map((b, i) => (
                    <input
                      key={i}
                      className={`${input} mt-2`}
                      value={b}
                      onChange={(e) =>
                        setConditions({
                          boundaries: spec.conditions.boundaries.map((x, j) => (j === i ? e.target.value : x)),
                        })
                      }
                    />
                  ))}
                  <div className="mt-3">
                    <SourceChips sources={["Interaction Boundaries", "Relational Consequences"]} />
                  </div>
                </div>
              </Section>
              )}

              <Section title="Opening moment" description="How the situation begins, mid-action.">
                <div className="whitespace-pre-line rounded-sm border border-border bg-muted/40 p-4 text-sm">
                  {spec.opening_moment.voices
                    .map((v) => `[${v.name}${v.cue ? `, ${v.cue}` : ""}]: "${v.line}"`)
                    .join("\n")}
                  {spec.opening_moment.observation ? `\n\n→ ${spec.opening_moment.observation}` : ""}
                </div>
              </Section>

              {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
              {notice && <p className="mb-3 text-sm text-muted-foreground">{notice}</p>}

              <div className="flex flex-wrap gap-3">
                <button className={btn} onClick={() => void save()} disabled={busy !== null}>
                  {busy === "save" ? "Saving…" : "SAVE DRAFT"}
                </button>
                <button
                  className={btn}
                  disabled={!data.versions.length}
                  onClick={() => navigate({ to: "/rehearse/$id", params: { id } })}
                >
                  TEST SIMULATION
                </button>
                <button className={btnPrimary} onClick={() => void publishNow()} disabled={busy !== null}>
                  {busy === "publish" ? "Publishing…" : "PUBLISH VERSION"}
                </button>
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <FoundationPanel />
          {documents.length > 0 && (
            <div className="panel p-5">
              <h3 className="text-xs uppercase tracking-widest text-primary">Local context</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {documents.map((d) => (
                  <li key={d.id}>
                    {d.file_name} — {d.status}
                    {d.status === "Ready" ? ` (${d.extracted_chars.toLocaleString()} chars)` : ""}
                    {d.error_message ? ` — ${d.error_message}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.versions.length > 0 && (
            <div className="panel p-5">
              <h3 className="text-xs uppercase tracking-widest text-primary">Published versions</h3>
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                {data.versions.map((v) => (
                  <li key={v.id}>
                    <div className="text-foreground">{v.version_label}</div>
                    <div>
                      {new Date(v.created_at).toLocaleString()} · {v.creator_label ?? "Educator"}
                    </div>
                    <div>
                      {v.foundation_version}
                      {v.model_identifier ? ` · ${v.model_identifier}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {person && (
        <Drawer title={person.name} onClose={() => setOpenPerson(null)}>
          <p className="mb-4 text-sm text-foreground">{person.scenario_relevant_background}</p>
          <DetailList label="Current goal" items={person.current_goal ? [person.current_goal] : []} />
          <DetailList label="Current concern" items={person.current_concern ? [person.current_concern] : []} />
          <DetailList label="Information this person knows" items={person.known_information} />
          <DetailList label="Currently hidden from the practicing teacher" items={person.latent_information} />
          <div className="mt-4">
            <SourceChips sources={person.provenance} />
          </div>
          <button className={`${btn} mt-4`} onClick={() => setSwapFor(person.id)}>
            SWAP PERSON
          </button>
        </Drawer>
      )}

      {swapFor && (
        <Drawer title="People Library" onClose={() => setSwapFor(null)}>
          <p className="mb-4 text-xs text-muted-foreground">
            Select another simulated person. Profiles are maintained in the People Library, not written here.
          </p>
          <ul className="divide-y divide-border border-t border-border">
            {(peopleQuery.data ?? []).map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="text-sm text-foreground">
                    {p.name} <span className="text-xs text-muted-foreground">· {p.participant_type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.descriptor}</div>
                  <div className="text-xs text-muted-foreground">
                    Close with {p.close_with.join(", ") || "—"}
                    {p.tension_with.length ? ` · Tension with ${p.tension_with.join(", ")}` : ""}
                  </div>
                </div>
                <button className={btn} onClick={() => swapPerson(swapFor, p)}>
                  Select
                </button>
              </li>
            ))}
          </ul>
        </Drawer>
      )}

      {why && (
        <Drawer title="Why is this here?" onClose={() => setWhy(null)}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {why.length ? why.map((w) => <li key={w}>{w}</li>) : <li>No source was recorded.</li>}
          </ul>
        </Drawer>
      )}

      <div className="mt-6">
        <Chip>{data.scenario.status}</Chip>
      </div>
    </AppShell>
  );
}

function AddItem({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text.trim());
        setText("");
      }}
    >
      <input className={input} placeholder="Add an item" value={text} onChange={(e) => setText(e.target.value)} />
      <button className={btn} type="submit">
        Add
      </button>
    </form>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-2 rounded-sm border border-border bg-muted px-2 py-1 text-xs"
          >
            {t}
            <button
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onChange(tags.filter((x) => x !== t))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onChange([...tags, text.trim()]);
          setText("");
        }}
      >
        <input className={input} placeholder="Add a tag" value={text} onChange={(e) => setText(e.target.value)} />
        <button className={btn} type="submit">
          Add
        </button>
      </form>
    </div>
  );
}
