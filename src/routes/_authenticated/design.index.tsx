import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Section, btn, btnPrimary, input } from "@/components/AppShell";
import { PRIVACY_REMINDER } from "@/lib/config";
import { FoundationPanel } from "@/components/FoundationPanel";
import { supabase } from "@/integrations/supabase/client";
import { createScenario } from "@/lib/api/scenarios.functions";
import { createDocumentRecord, finalizeDocument, markDocumentUploaded } from "@/lib/api/documents.functions";
import { extractDocumentText } from "@/lib/documents/extractText";

export const Route = createFileRoute("/_authenticated/design/")({
  head: () => ({
    meta: [
      { title: "Design Lab — Classroom Coach" },
      {
        name: "description",
        content:
          "State what someone should practice, add local context documents, and let Classroom Coach derive a structured simulation.",
      },
      { property: "og:title", content: "Design Lab — Classroom Coach" },
      { property: "og:description", content: "Turn a teaching purpose and local context into a structured rehearsal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DesignStart,
});

const EXAMPLES = [
  {
    purpose:
      "Responding to conflict between two students without losing the instructional purpose of the lesson.",
    practitioner: "Preservice teacher",
    specifics: "Two students who are usually close have stopped speaking to each other.",
  },
  {
    purpose: "Redirecting a student who is disengaged without singling them out in front of peers.",
    practitioner: "First-year classroom teacher",
    specifics: "The student has been withdrawn since a group project reassignment.",
  },
  {
    purpose: "Holding a boundary about materials and safety while keeping the relationship intact.",
    practitioner: "Student teacher",
    specifics: "A student repeatedly ignores a shared-equipment routine.",
  },
  {
    purpose: "Responding to a student who challenges your decision in front of the whole class.",
    practitioner: "Preservice teacher",
    specifics: "The challenge follows a seating change the class did not expect.",
  },
  {
    purpose: "Checking in with a student whose participation has dropped sharply this month.",
    practitioner: "Early-career teacher",
    specifics: "Other students have started to notice and comment.",
  },
  {
    purpose: "Facilitating a repair conversation after a comment that hurt another student.",
    practitioner: "Preservice teacher",
    specifics: "Both students want to move on but have not spoken about it.",
  },
];

const SETTINGS = [
  "7th-grade band rehearsal",
  "8th-grade science lab",
  "High school art studio",
  "6th-grade general music",
  "Middle school chorus",
  "7th-grade humanities block",
];

interface PendingFile {
  file: File;
  status: "Pending" | "Uploading" | "Ready" | "Failed";
  chars: number;
  message?: string;
}

function DesignStart() {
  const navigate = useNavigate();
  const create = useServerFn(createScenario);
  const createDoc = useServerFn(createDocumentRecord);
  const markUploaded = useServerFn(markDocumentUploaded);
  const finalize = useServerFn(finalizeDocument);

  const [purpose, setPurpose] = useState("");
  const [practitioner, setPractitioner] = useState("");
  const [setting, setSetting] = useState("");
  const [specifics, setSpecifics] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fillExample = () => {
    const pool = EXAMPLES.filter((e) => e.purpose !== purpose);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? {
      purpose: "Practicing a difficult classroom conversation while keeping the learning goal in view.",
      practitioner: "Preservice teacher",
      specifics: "A student needs support, and the rest of the group is watching.",
    };
    const settingPool = SETTINGS.filter((value) => value !== setting);
    const nextSetting = settingPool[Math.floor(Math.random() * settingPool.length)] ?? "7th-grade classroom";
    setPurpose(pick.purpose);
    setPractitioner(pick.practitioner);
    setSetting(nextSetting);
    setSpecifics(pick.specifics);
    setError(null);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list).map((file) => ({ file, status: "Pending" as const, chars: 0 }))]);
  };

  const build = async () => {
    if (!purpose.trim()) {
      setError("Describe what someone should practice before building a scenario.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { id } = await create({
        data: { purpose, practicingRole: practitioner, setting, specifics },
      });

      for (const [index, pending] of files.entries()) {
        setFiles((list) => list.map((f, i) => (i === index ? { ...f, status: "Uploading" } : f)));
        try {
          const { id: documentId } = await createDoc({
            data: {
              scenarioId: id,
              fileName: pending.file.name,
              mimeType: pending.file.type || "application/octet-stream",
              byteSize: pending.file.size,
            },
          });
          const { data: userData } = await supabase.auth.getUser();
          const path = `${userData.user?.id}/${id}/${documentId}-${pending.file.name}`;
          const upload = await supabase.storage.from("context-documents").upload(path, pending.file, {
            upsert: true,
          });
          if (upload.error) throw new Error(upload.error.message);
          await markUploaded({ data: { documentId, storagePath: path } });

          const extraction = await extractDocumentText(pending.file);
          const result = await finalize({
            data: {
              documentId,
              scenarioId: id,
              ...(extraction.text ? { text: extraction.text } : {}),
              ...(extraction.error ? { error: extraction.error } : {}),
            },
          });
          setFiles((list) =>
            list.map((f, i) =>
              i === index
                ? {
                    ...f,
                    status: result.status === "Ready" ? "Ready" : "Failed",
                    chars: extraction.text?.length ?? 0,
                    ...(extraction.error ? { message: extraction.error } : {}),
                  }
                : f,
            ),
          );
        } catch (err) {
          setFiles((list) =>
            list.map((f, i) =>
              i === index ? { ...f, status: "Failed", message: (err as Error).message } : f,
            ),
          );
        }
      }

      void navigate({ to: "/design/$id", params: { id } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-primary">What should someone practice?</h1>
            <button className={btn} onClick={fillExample} disabled={busy}>
              Try an example
            </button>
          </div>
          <p id="privacy-reminder" className="mt-3 border-l-2 border-ring/40 bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
            {PRIVACY_REMINDER}
          </p>
          <label className="sr-only" htmlFor="practice-purpose">
            What should someone practice?
          </label>
          <textarea
            id="practice-purpose"
            aria-describedby="privacy-reminder"
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
              Is there anything specific the simulation should include?{" "}
              <span className="text-muted-foreground">(optional)</span>
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
                addFiles(e.dataTransfer.files);
              }}
              className={`rounded-sm border border-dashed p-8 text-center ${
                dragging ? "border-ring bg-accent/40" : "border-border"
              }`}
            >
              <p className="text-sm text-foreground">Drag and drop or select files</p>
              <p className="mt-1 text-xs text-muted-foreground">TXT, MD, DOCX and PDF are supported.</p>
              <button className={`${btn} mt-4`} onClick={() => fileRef.current?.click()} disabled={busy}>
                Select files
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".txt,.md,.docx,.pdf"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {files.map((f, i) => (
                  <li key={`${f.file.name}-${i}`} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground">{f.file.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {f.status}
                        {f.chars ? ` · ${f.chars.toLocaleString()} characters extracted` : ""}
                        {f.message ? ` · ${f.message}` : ""}
                      </div>
                    </div>
                    <button
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFiles((list) => list.filter((_, j) => j !== i))}
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

          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <button className={btnPrimary} onClick={() => void build()} disabled={busy}>
            {busy ? "Preparing…" : "BUILD SCENARIO DRAFT"}
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
