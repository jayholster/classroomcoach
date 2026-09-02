import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell, Section, btn, btnPrimary, input } from "@/components/AppShell";
import { FoundationPanel } from "@/components/FoundationPanel";
import { deriveDraft, uid } from "@/lib/derive";
import { upsertSimulation } from "@/lib/store";
import type { ContextFile, Simulation } from "@/lib/types";

export const Route = createFileRoute("/design/")({
  head: () => ({
    meta: [
      { title: "Design Lab — Classroom Coach" },
      {
        name: "description",
        content:
          "State what someone should practice, add local context documents, and let Classroom Coach derive a structured simulation.",
      },
      { property: "og:title", content: "Design Lab — Classroom Coach" },
      {
        property: "og:description",
        content: "Turn a teaching purpose and local context into a structured rehearsal.",
      },
    ],
  }),
  component: DesignStart,
});

async function extractText(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buf = await file.arrayBuffer();
    const result = await (mammoth as unknown as {
      extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    }).extractRawText({ arrayBuffer: buf });
    return result.value;
  }
  return file.text();
}

function DesignStart() {
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState("");
  const [practitioner, setPractitioner] = useState("");
  const [setting, setSetting] = useState("");
  const [specifics, setSpecifics] = useState("");
  const [files, setFiles] = useState<ContextFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    setBusy(true);
    const next: ContextFile[] = [];
    for (const file of Array.from(list)) {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".txt") && !lower.endsWith(".docx")) continue;
      try {
        const text = await extractText(file);
        next.push({
          id: uid(),
          name: file.name,
          chars: text.length,
          excerpt: text.replace(/\s+/g, " ").trim().slice(0, 400),
        });
      } catch {
        next.push({ id: uid(), name: file.name, chars: 0, excerpt: "Could not read this file." });
      }
    }
    setFiles((f) => [...f, ...next]);
    setBusy(false);
  };

  const build = () => {
    const draft = deriveDraft({ purpose, practitioner, setting, specifics, contextFiles: files });
    const sim: Simulation = {
      id: uid(),
      title: setting.trim() || "Untitled Simulation",
      subtitle: purpose.trim().slice(0, 70) || "New practice situation",
      status: "Draft",
      versionLabel: "Version 1",
      updatedAt: new Date().toISOString(),
      purpose,
      practitioner,
      setting,
      specifics,
      contextFiles: files,
      draft,
      versions: [],
    };
    upsertSimulation(sim);
    navigate({ to: "/design/$id", params: { id: sim.id } });
  };

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">What should someone practice?</h1>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={4}
            placeholder="Responding to conflict between students in a middle school ensemble without losing the instructional purpose of rehearsal."
            className={`${input} mt-4 text-base leading-relaxed`}
          />

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm text-foreground" htmlFor="who">
                Who is practicing?
              </label>
              <input
                id="who"
                value={practitioner}
                onChange={(e) => setPractitioner(e.target.value)}
                placeholder="Preservice music teacher"
                className={`${input} mt-2`}
              />
            </div>
            <div>
              <label className="text-sm text-foreground" htmlFor="setting">
                Setting
              </label>
              <input
                id="setting"
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                placeholder="7th-grade band rehearsal"
                className={`${input} mt-2`}
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm text-foreground" htmlFor="specifics">
              Is there anything specific the simulation should include? <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="specifics"
              value={specifics}
              onChange={(e) => setSpecifics(e.target.value)}
              rows={2}
              className={`${input} mt-2`}
            />
          </div>

          <Section
            title="Local context"
            description="Add materials that should shape this simulation, such as lesson plans, curriculum, program policies, rehearsal plans, professional standards, local procedures, or other context."
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void addFiles(e.dataTransfer.files);
              }}
              className={`rounded-sm border border-dashed p-8 text-center ${
                dragging ? "border-ring bg-accent/40" : "border-border"
              }`}
            >
              <p className="text-sm text-foreground">Drag and drop or select files</p>
              <p className="mt-1 text-xs text-muted-foreground">TXT and DOCX supported in this prototype.</p>
              <button className={`${btn} mt-4`} onClick={() => fileRef.current?.click()} disabled={busy}>
                {busy ? "Reading…" : "Select files"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.docx"
                multiple
                className="hidden"
                onChange={(e) => void addFiles(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {files.map((f) => (
                  <li key={f.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground">{f.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {f.chars.toLocaleString()} characters extracted — {f.excerpt.slice(0, 120)}…
                      </div>
                    </div>
                    <button
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFiles((list) => list.filter((x) => x.id !== f.id))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Local context is optional. Classroom Coach can build a scenario from its existing foundation.
            </p>
          </Section>

          <button className={btnPrimary} onClick={build}>
            BUILD SCENARIO DRAFT
          </button>
        </div>

        <aside className="space-y-4">
          <FoundationPanel />
          <div className="panel p-5 text-xs leading-relaxed text-muted-foreground">
            You describe the teaching purpose and local context. Classroom Coach already knows how to construct and run
            the simulation. You review and govern the decisions that matter.
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
