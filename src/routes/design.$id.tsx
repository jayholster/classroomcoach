import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, Chip, Section, SourceChips, btn, btnPrimary, input } from "@/components/AppShell";
import { FoundationPanel } from "@/components/FoundationPanel";
import { PEOPLE_LIBRARY, getPerson } from "@/lib/foundation/people";
import { FOUNDATION_VERSION } from "@/lib/foundation/resources";
import { toScenarioPerson, uid } from "@/lib/derive";
import { loadSimulations, upsertSimulation } from "@/lib/store";
import type { ScenarioPerson, Simulation } from "@/lib/types";

export const Route = createFileRoute("/design/$id")({
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
    ],
  }),
  component: DesignReview,
});

function DesignReview() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [sim, setSim] = useState<Simulation | null>(null);
  const [openPerson, setOpenPerson] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    setSim(loadSimulations().find((s) => s.id === id) ?? null);
  }, [id]);

  const fileNames = useMemo(() => sim?.contextFiles.map((f) => f.name) ?? [], [sim]);

  if (!sim) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Simulation not found.</p>
      </AppShell>
    );
  }

  const update = (next: Simulation) => {
    setSim(next);
    upsertSimulation({ ...next, updatedAt: new Date().toISOString() });
  };
  const setDraft = (patch: Partial<Simulation["draft"]>) => update({ ...sim, draft: { ...sim.draft, ...patch } });
  const setConditions = (patch: Partial<Simulation["draft"]["conditions"]>) =>
    setDraft({ conditions: { ...sim.draft.conditions, ...patch } });

  const person = openPerson ? sim.draft.people.find((p) => p.personId === openPerson) : null;

  const swapPerson = (targetId: string, newId: string) => {
    const profile = getPerson(newId);
    if (!profile) return;
    const replacement: ScenarioPerson = toScenarioPerson(
      profile,
      `${profile.name} was selected by the educator from the People Library for this simulation.`,
      ["People Library", ...fileNames.slice(0, 1)],
    );
    setDraft({ people: sim.draft.people.map((p) => (p.personId === targetId ? replacement : p)) });
    setSwapFor(null);
    setOpenPerson(null);
  };

  const publish = () => {
    const nextNumber = sim.versions.length + 1;
    const version = `v${nextNumber}.0`;
    update({
      ...sim,
      status: "Published",
      versionLabel: `Version ${nextNumber}`,
      versions: [
        ...sim.versions,
        {
          version,
          createdBy: "M. Rivera",
          date: new Date().toISOString(),
          foundationVersion: FOUNDATION_VERSION,
          contextFiles: fileNames,
          draft: sim.draft,
        },
      ],
    });
    setSaved(`Published ${sim.title} — ${version}`);
  };

  const visible = sim.draft.information.filter((i) => i.state === "visible");
  const latent = sim.draft.information.filter((i) => i.state === "latent");

  const moveInfo = (itemId: string) =>
    setDraft({
      information: sim.draft.information.map((i) =>
        i.id === itemId ? { ...i, state: i.state === "visible" ? "latent" : "visible" } : i,
      ),
    });

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

          <Section title="Purpose">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Practice goal</label>
            <textarea
              className={`${input} mt-1`}
              rows={2}
              value={sim.draft.practiceGoal}
              onChange={(e) => setDraft({ practiceGoal: e.target.value })}
            />
            <label className="mt-4 block text-xs uppercase tracking-wide text-muted-foreground">Practicing role</label>
            <input
              className={`${input} mt-1`}
              value={sim.draft.practicingRole}
              onChange={(e) => setDraft({ practicingRole: e.target.value })}
            />
            <div className="mt-4">
              <SourceChips sources={["Core Simulation Instructions", ...fileNames]} />
            </div>
          </Section>

          <Section title="Setting">
            {sim.draft.setting.map((line, i) => (
              <input
                key={i}
                className={`${input} mb-2`}
                value={line}
                onChange={(e) =>
                  setDraft({ setting: sim.draft.setting.map((s, j) => (j === i ? e.target.value : s)) })
                }
              />
            ))}
          </Section>

          <Section
            title="Simulated people"
            description="Suggested from the existing People Library. Select a person to see the scenario-relevant information."
          >
            <ul className="divide-y divide-border border-t border-border">
              {sim.draft.people.map((p) => (
                <li key={p.personId} className="flex items-center justify-between gap-4 py-3">
                  <button className="text-left" onClick={() => setOpenPerson(p.personId)}>
                    <div className="text-sm font-medium text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.gradeLabel} · {p.type}
                    </div>
                    <div className="mt-1">
                      <SourceChips sources={p.sources} />
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <button className={btn} onClick={() => setWhy(p.rationale)}>
                      Why is this here?
                    </button>
                    <button className={btn} onClick={() => setSwapFor(p.personId)}>
                      Swap person
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Relationships & tensions"
            description="Situational only. Adjusting these does not change the person's underlying profile."
            actions={
              <button
                className={btn}
                onClick={() =>
                  setDraft({
                    relationships: [
                      ...sim.draft.relationships,
                      { id: uid(), a: "", b: "", label: "Current tension", value: "Emerging", sources: ["Educator"] },
                    ],
                  })
                }
              >
                Add situational relationship
              </button>
            }
          >
            <ul className="space-y-3">
              {sim.draft.relationships.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <input
                    className={`${input} w-32`}
                    value={r.a}
                    onChange={(e) =>
                      setDraft({
                        relationships: sim.draft.relationships.map((x) =>
                          x.id === r.id ? { ...x, a: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <span className="text-muted-foreground">↔</span>
                  <input
                    className={`${input} w-32`}
                    value={r.b}
                    onChange={(e) =>
                      setDraft({
                        relationships: sim.draft.relationships.map((x) =>
                          x.id === r.id ? { ...x, b: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <select
                    className={`${input} w-44`}
                    value={r.label}
                    onChange={(e) =>
                      setDraft({
                        relationships: sim.draft.relationships.map((x) =>
                          x.id === r.id ? { ...x, label: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    <option>Current tension</option>
                    <option>Relationship</option>
                  </select>
                  <input
                    className={`${input} w-40`}
                    value={r.value}
                    onChange={(e) =>
                      setDraft({
                        relationships: sim.draft.relationships.map((x) =>
                          x.id === r.id ? { ...x, value: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <button
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setDraft({ relationships: sim.draft.relationships.filter((x) => x.id !== r.id) })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <SourceChips sources={["People Library", "Scenario Dynamics"]} />
            </div>
          </Section>

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
                    {(state === "visible" ? visible : latent).map((i) => (
                      <li key={i.id} className="flex items-start gap-2 border-b border-border pb-2">
                        <span className="flex-1 text-sm text-foreground">{i.text}</span>
                        <button className="text-xs text-muted-foreground hover:text-primary" onClick={() => moveInfo(i.id)}>
                          {state === "visible" ? "→ Latent" : "→ Visible"}
                        </button>
                        <button
                          className="text-xs text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setDraft({ information: sim.draft.information.filter((x) => x.id !== i.id) })
                          }
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <AddItem
                    onAdd={(text) =>
                      setDraft({ information: [...sim.draft.information, { id: uid(), text, state }] })
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
              value={sim.draft.conditions.startingMoment}
              onChange={(e) => setConditions({ startingMoment: e.target.value })}
            />

            <div className="mt-5">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                What should make this difficult?
              </label>
              <TagEditor
                tags={sim.draft.conditions.difficultyTags}
                onChange={(difficultyTags) => setConditions({ difficultyTags })}
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Interaction intensity</label>
                <select
                  className={`${input} mt-1`}
                  value={sim.draft.conditions.intensity}
                  onChange={(e) =>
                    setConditions({ intensity: e.target.value as Simulation["draft"]["conditions"]["intensity"] })
                  }
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
                  value={sim.draft.conditions.pacing}
                  onChange={(e) =>
                    setConditions({ pacing: e.target.value as Simulation["draft"]["conditions"]["pacing"] })
                  }
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
                  ["allowImprovement", "Allow relationships to improve"],
                  ["allowDeterioration", "Allow relationships to deteriorate"],
                  ["allowComplications", "Allow new complications to emerge"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={sim.draft.conditions[key]}
                    onChange={(e) => setConditions({ [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="mt-5">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Reflection focus</label>
              <TagEditor
                tags={sim.draft.conditions.reflectionFocus}
                onChange={(reflectionFocus) => setConditions({ reflectionFocus })}
              />
            </div>

            <div className="mt-6">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Boundaries</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Derived from the Classroom Coach foundation. Normally left in place.
              </p>
              {sim.draft.conditions.boundaries.map((b, i) => (
                <input
                  key={i}
                  className={`${input} mt-2`}
                  value={b}
                  onChange={(e) =>
                    setConditions({
                      boundaries: sim.draft.conditions.boundaries.map((x, j) => (j === i ? e.target.value : x)),
                    })
                  }
                />
              ))}
              <div className="mt-3">
                <SourceChips sources={["Interaction Boundaries", "Relational Consequences"]} />
              </div>
            </div>
          </Section>

          <div className="flex flex-wrap gap-3">
            <button
              className={btn}
              onClick={() => {
                update(sim);
                setSaved("Draft saved.");
              }}
            >
              SAVE DRAFT
            </button>
            <button className={btn} onClick={() => navigate({ to: "/rehearse/$id", params: { id: sim.id } })}>
              TEST SIMULATION
            </button>
            <button className={btnPrimary} onClick={publish}>
              PUBLISH VERSION
            </button>
          </div>
          {saved && <p className="mt-3 text-sm text-primary">{saved}</p>}

          {sim.versions.length > 0 && (
            <Section title="Published versions">
              <ul className="divide-y divide-border border-t border-border text-sm">
                {sim.versions.map((v) => (
                  <li key={v.version} className="py-3">
                    <div className="font-medium text-foreground">
                      {sim.title} — {sim.subtitle}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Version {v.version} · Created by {v.createdBy} · {new Date(v.date).toLocaleString()} ·{" "}
                      {v.foundationVersion} · Local context:{" "}
                      {v.contextFiles.length ? v.contextFiles.join(", ") : "none"}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <aside className="space-y-4">
          <FoundationPanel />
          {fileNames.length > 0 && (
            <div className="panel p-5">
              <h3 className="text-xs uppercase tracking-widest text-primary">Local context</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {fileNames.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {person && (
        <Drawer title={`${person.name} — ${person.gradeLabel}`} onClose={() => setOpenPerson(null)}>
          <DetailList label="Relevant tendencies" items={person.tendencies} />
          <DetailList label="Relationships" items={person.relationships} />
          <DetailList label="Known tensions" items={person.tensions} />
          <DetailList label="Relevant interests / context" items={person.interests} />
          <DetailList label="Information this person knows" items={person.knows} />
          <DetailList label="Information currently hidden from the practicing teacher" items={person.hiddenFromTeacher} />
          <div className="mt-4">
            <SourceChips sources={person.sources} />
          </div>
          <button className={`${btn} mt-4`} onClick={() => setSwapFor(person.personId)}>
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
            {PEOPLE_LIBRARY.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="text-sm text-foreground">
                    {p.name} <span className="text-xs text-muted-foreground">· {p.type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.descriptor}</div>
                  <div className="text-xs text-muted-foreground">
                    Close with {p.closeWith.join(", ") || "—"}
                    {p.tensionWith.length ? ` · Rivalry with ${p.tensionWith.join(", ")}` : ""}
                  </div>
                </div>
                <button className={btn} onClick={() => swapPerson(swapFor, p.id)}>
                  Select
                </button>
              </li>
            ))}
          </ul>
        </Drawer>
      )}

      {why && (
        <Drawer title="Why is this here?" onClose={() => setWhy(null)}>
          <p className="text-sm leading-relaxed text-foreground">{why}</p>
        </Drawer>
      )}
    </AppShell>
  );
}

function DetailList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mb-4">
      <h4 className="text-xs uppercase tracking-wide text-muted-foreground">{label}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
        {items.length ? items.map((i) => <li key={i}>{i}</li>) : <li className="text-muted-foreground">None recorded</li>}
      </ul>
    </div>
  );
}

export function Drawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-primary/20" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
          <button className="text-sm text-muted-foreground hover:text-foreground" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
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
          <span key={t} className="inline-flex items-center gap-2 rounded-sm border border-border bg-muted px-2 py-1 text-xs">
            {t}
            <button className="text-muted-foreground hover:text-destructive" onClick={() => onChange(tags.filter((x) => x !== t))}>
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

export { Chip };
