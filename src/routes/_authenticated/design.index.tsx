import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Section, btn, btnPrimary, input } from "@/components/AppShell";
import { PRIVACY_REMINDER } from "@/lib/config";
import { FoundationPanel } from "@/components/FoundationPanel";
import { supabase } from "@/integrations/supabase/client";
import { createScenario } from "@/lib/api/scenarios.functions";
import { createDocumentRecord, finalizeDocument, markDocumentUploaded } from "@/lib/api/documents.functions";
import { extractDocumentText } from "@/lib/documents/extractText";
import { generateStructuredScenario } from "@/lib/api/generate.functions";

export const Route = createFileRoute("/_authenticated/design/")({
  head: () => ({
    meta: [
      { title: "Design Lab — Classroom Coach" },
      {
        name: "description",
        content: "Choose a focused teaching moment and build a structured Classroom Coach rehearsal.",
      },
      { property: "og:title", content: "Design Lab — Classroom Coach" },
      { property: "og:description", content: "Choose a focused teaching moment and build a structured rehearsal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DesignStart,
});

const CUSTOM = "custom";

const PRACTICE_FOCUSES = [
  { value: "responding-conflict", label: "Respond to student conflict", purpose: "Responding to conflict between students while keeping the learning purpose in view." },
  { value: "redirect-disengagement", label: "Redirect disengagement", purpose: "Redirect a disengaged student without singling them out in front of peers." },
  { value: "hold-boundary", label: "Hold a boundary", purpose: "Hold a clear boundary while keeping the student relationship intact." },
  { value: "repair-harm", label: "Facilitate repair", purpose: "Facilitate a repair conversation after a comment or action caused harm." },
];

const ROLES = ["Preservice teacher", "First-year classroom teacher", "Student teacher", "Instructional coach"];
const SETTINGS = ["7th-grade band rehearsal", "8th-grade science lab", "High school art studio", "6th-grade general music", "Middle school chorus", "7th-grade humanities block"];
const DIFFICULT_MOMENTS = [
  { value: "student-conflict", label: "Student conflict", description: "Two students are in tension and the group is watching." },
  { value: "public-challenge", label: "Public challenge", description: "A student challenges a decision in front of peers." },
  { value: "disengagement", label: "Student disengagement", description: "A student withdraws while the lesson or rehearsal continues." },
  { value: "boundary-safety", label: "Boundary or safety", description: "A routine or safety boundary is being ignored." },
];
const STUDENT_COUNTS = [1, 2, 3] as const;
const OTHER_PEOPLE = ["Parent or guardian", "Administrator", "Another teacher", "Paraprofessional or aide"];

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
  const derive = useServerFn(generateStructuredScenario);

  const [focus, setFocus] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [practitioner, setPractitioner] = useState(ROLES[0] ?? "");
  const [setting, setSetting] = useState(SETTINGS[0] ?? "");
  const [studentCount, setStudentCount] = useState<number>(2);
  const [difficultMoment, setDifficultMoment] = useState("");
  const [customMoment, setCustomMoment] = useState("");
  const [others, setOthers] = useState<string[]>([]);
  const [customOther, setCustomOther] = useState("");
  const [specifics, setSpecifics] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  const fillExample = () => {
    const focusPool = PRACTICE_FOCUSES.filter((item) => item.value !== focus);
    const settingPool = SETTINGS.filter((item) => item !== setting);
    const focusPick = focusPool[Math.floor(Math.random() * focusPool.length)] ?? PRACTICE_FOCUSES[0];
    const settingPick = settingPool[Math.floor(Math.random() * settingPool.length)] ?? SETTINGS[0];
    const moment = DIFFICULT_MOMENTS[Math.floor(Math.random() * DIFFICULT_MOMENTS.length)] ?? DIFFICULT_MOMENTS[0];
    if (!focusPick || !settingPick || !moment) return;
    setFocus(focusPick.value);
    setSetting(settingPick);
    setDifficultMoment(moment.value);
    setStudentCount(STUDENT_COUNTS[Math.floor(Math.random() * STUDENT_COUNTS.length)] ?? 2);
    setCustomFocus("");
    setCustomMoment("");
    setOthers([]);
    setCustomOther("");
    setSpecifics("");
    setError(null);
  };

  const toggleOther = (value: string) => {
    setOthers((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((current) => [...current, ...Array.from(list).map((file) => ({ file, status: "Pending" as const, chars: 0 }))]);
  };

  const build = async () => {
    const selectedFocus = PRACTICE_FOCUSES.find((item) => item.value === focus);
    const purpose = focus === CUSTOM ? customFocus.trim() : selectedFocus?.purpose;
    const momentLabel = difficultMoment === CUSTOM
      ? customMoment.trim()
      : DIFFICULT_MOMENTS.find((item) => item.value === difficultMoment)?.label;
    const selectedOthers = [...others, ...(customOther.trim() ? [customOther.trim()] : [])];
    if (!purpose || !momentLabel) {
      setError("Choose a practice focus and a difficult moment before building a scenario.");
      return;
    }
    setBusy(true);
    setStage(1);
    setError(null);
    try {
      const { id } = await create({
        data: {
          purpose,
          practicingRole: practitioner || ROLES[0] || "Preservice teacher",
          setting: setting || SETTINGS[0] || "Classroom",
          specifics: [
            `Practice focus: ${focus === CUSTOM ? purpose : selectedFocus?.label ?? purpose}.`,
            `Difficult moment: ${momentLabel}.`,
            `Simulate exactly ${studentCount} student${studentCount === 1 ? "" : "s"}.`,
            selectedOthers.length ? `Others in the situation: ${selectedOthers.join(", ")}.` : "",
            specifics.trim(),
          ].filter(Boolean).join(" "),
          studentCount,
          difficultMoment: difficultMoment === CUSTOM ? momentLabel : difficultMoment,
        },
      });

      if (files.length) setStage(2);
      for (const [index, pending] of files.entries()) {
        setFiles((list) => list.map((file, i) => (i === index ? { ...file, status: "Uploading" } : file)));
        try {
          const { id: documentId } = await createDoc({
            data: { scenarioId: id, fileName: pending.file.name, mimeType: pending.file.type || "application/octet-stream", byteSize: pending.file.size },
          });
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id;
          if (!userId) throw new Error("Your session expired. Sign in again to upload context.");
          const path = `${userId}/${id}/${documentId}-${pending.file.name}`;
          const upload = await supabase.storage.from("context-documents").upload(path, pending.file, { upsert: true });
          if (upload.error) throw new Error(upload.error.message);
          await markUploaded({ data: { documentId, storagePath: path } });
          const extraction = await extractDocumentText(pending.file);
          const result = await finalize({ data: { documentId, scenarioId: id, ...(extraction.text ? { text: extraction.text } : {}), ...(extraction.error ? { error: extraction.error } : {}) } });
          setFiles((list) => list.map((file, i) => i === index ? { ...file, status: result.status === "Ready" ? "Ready" : "Failed", chars: extraction.text?.length ?? 0, ...(extraction.error ? { message: extraction.error } : {}) } : file));
        } catch (err) {
          setFiles((list) => list.map((file, i) => i === index ? { ...file, status: "Failed", message: (err as Error).message } : file));
        }
      }
      setStage(3);
      const derived = await derive({ data: { scenarioId: id } });
      if (!derived.ok) setError(derived.error);
      void navigate({ to: "/design/$id", params: { id } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Design Lab</p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-primary">Set up a practice moment</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Choose a focused situation. Classroom Coach will build the people, setting, and interaction for you to review.</p>
            </div>
            <button className={btn} onClick={fillExample} disabled={busy}>Try a random example</button>
          </div>

          <p id="privacy-reminder" className="mt-6 border-l-2 border-ring/40 bg-accent/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">{PRIVACY_REMINDER}</p>

          <Section title="1. Choose the practice focus">
            <div className="grid gap-3 sm:grid-cols-2">
              {PRACTICE_FOCUSES.map((item) => (
                <ChoiceCard key={item.value} selected={focus === item.value} onClick={() => setFocus(item.value)} title={item.label} description={item.purpose} />
              ))}
              <ChoiceCard selected={focus === CUSTOM} onClick={() => setFocus(CUSTOM)} title="Add your own focus" description="Describe the teaching practice in your own words." />
            </div>
            {focus === CUSTOM && <div className="mt-4"><label className="text-sm text-foreground" htmlFor="custom-focus">Your practice focus</label><input id="custom-focus" value={customFocus} onChange={(event) => setCustomFocus(event.target.value)} className={`${input} mt-2`} placeholder="For example: Help a student rejoin the group after a mistake." /></div>}
          </Section>

          <Section title="2. Choose the difficult moment">
            <div className="grid gap-3 sm:grid-cols-2">
              {DIFFICULT_MOMENTS.map((item) => (
                <ChoiceCard key={item.value} selected={difficultMoment === item.value} onClick={() => setDifficultMoment(item.value)} title={item.label} description={item.description} />
              ))}
              <ChoiceCard selected={difficultMoment === CUSTOM} onClick={() => setDifficultMoment(CUSTOM)} title="Add your own moment" description="Describe the moment you want to step into." />
            </div>
            {difficultMoment === CUSTOM && <div className="mt-4"><label className="text-sm text-foreground" htmlFor="custom-moment">Your difficult moment</label><input id="custom-moment" value={customMoment} onChange={(event) => setCustomMoment(event.target.value)} className={`${input} mt-2`} placeholder="For example: A student refuses to join a partner activity." /></div>}
          </Section>

          <Section title="3. Set the room">
            <div className="grid gap-5 sm:grid-cols-2">
              <ComboField id="practitioner" label="Who is practicing?" value={practitioner} onChange={setPractitioner} options={ROLES} />
              <ComboField id="setting" label="Setting" value={setting} onChange={setSetting} options={SETTINGS} />
            </div>
            <div className="mt-5">
              <label className="text-sm text-foreground" htmlFor="student-count">Students in the situation</label>
              <div id="student-count" className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Students in the situation">
                {STUDENT_COUNTS.map((count) => (
                  <button key={count} type="button" aria-pressed={studentCount === count} className={`${studentCount === count ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-foreground hover:bg-muted"} rounded-sm border px-3 py-3 text-sm font-medium`} onClick={() => setStudentCount(count)}>
                    {count} student{count === 1 ? "" : "s"}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Choose one to three students for this first rehearsal configuration.</p>
            </div>
            <div className="mt-5">
              <p className="text-sm text-foreground">Others in the situation <span className="text-muted-foreground">(optional)</span></p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Others in the situation">
                {OTHER_PEOPLE.map((person) => <button key={person} type="button" aria-pressed={others.includes(person)} onClick={() => toggleOther(person)} className={`${others.includes(person) ? "border-primary bg-accent text-primary" : "border-input bg-background text-foreground hover:bg-muted"} rounded-full border px-3 py-2 text-xs`}>{person}</button>)}
                <button type="button" aria-pressed={Boolean(customOther)} onClick={() => setCustomOther(customOther ? "" : " ")} className={`${customOther ? "border-primary bg-accent text-primary" : "border-input bg-background text-foreground hover:bg-muted"} rounded-full border px-3 py-2 text-xs`}>Add your own</button>
              </div>
              {customOther !== "" && <input aria-label="Your other participant" value={customOther.trim()} onChange={(event) => setCustomOther(event.target.value)} className={`${input} mt-3`} placeholder="For example: School counselor" />}
            </div>
            <label className="mt-5 block text-sm text-foreground" htmlFor="specifics">Anything else to include? <span className="text-muted-foreground">(optional)</span></label>
            <textarea id="specifics" value={specifics} onChange={(event) => setSpecifics(event.target.value)} rows={2} className={`${input} mt-2`} placeholder="For example: the rest of the group is watching." />
          </Section>

          <Section title="4. Add local context" description="Optional lesson plans, routines, policies, or other materials can shape the generated situation.">
            <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} className={`rounded-sm border border-dashed p-7 text-center ${dragging ? "border-ring bg-accent/40" : "border-border"}`}>
              <p className="text-sm text-foreground">Drag and drop files here</p>
              <p className="mt-1 text-xs text-muted-foreground">TXT, MD, DOCX, and PDF are supported.</p>
              <button className={`${btn} mt-4`} onClick={() => fileRef.current?.click()} disabled={busy}>Select files</button>
              <input ref={fileRef} type="file" multiple accept=".txt,.md,.docx,.pdf" className="hidden" onChange={(event) => addFiles(event.target.files)} />
            </div>
            {files.length > 0 && <ul className="mt-4 divide-y divide-border border-t border-border">{files.map((file, index) => <li key={`${file.file.name}-${index}`} className="flex items-start justify-between gap-4 py-3"><div className="min-w-0"><div className="text-sm text-foreground">{file.file.name}</div><div className="truncate text-xs text-muted-foreground">{file.status}{file.chars ? ` · ${file.chars.toLocaleString()} characters extracted` : ""}{file.message ? ` · ${file.message}` : ""}</div></div><button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setFiles((list) => list.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></li>)}</ul>}
          </Section>

          {error && <p className="mb-3 text-sm text-destructive" role="alert">{error}</p>}
          <button className={`${btnPrimary} min-h-11 px-5`} onClick={() => void build()} disabled={busy}>{busy ? "Building your simulation…" : "BUILD SCENARIO"}</button>
          {busy && (
            <div className="mt-4 panel p-4" role="status" aria-live="polite">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-medium text-foreground">{BUILD_STAGES[stage - 1] ?? BUILD_STAGES[0]}</p>
                <span className="text-xs tabular-nums text-muted-foreground">{elapsed}s</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.min(95, stage * 30 + Math.min(elapsed, 20))}%` }} />
              </div>
              <ol className="mt-3 space-y-1 text-xs text-muted-foreground">
                {BUILD_STAGES.map((label, index) => (
                  <li key={label} className={index + 1 <= stage ? "text-foreground" : ""}>{index + 1 < stage ? "✓ " : index + 1 === stage ? "• " : "· "}{label}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">Deriving the people and relationships usually takes under a minute.</p>
            </div>
          )}
        </div>
        <aside className="space-y-4"><FoundationPanel /><div className="panel p-5 text-xs leading-relaxed text-muted-foreground">Your choices guide the scenario. You review and govern the generated situation before anyone rehearses it.</div></aside>
      </div>
    </AppShell>
  );
}

const BUILD_STAGES = [
  "Saving your setup",
  "Reading your documents",
  "Deriving the people, relationships, and opening moment",
] as const;

function ChoiceCard({ selected, onClick, title, description }: { selected: boolean; onClick: () => void; title: string; description: string }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`rounded-sm border p-4 text-left transition-colors ${selected ? "border-primary bg-accent/60 ring-1 ring-ring" : "border-border bg-card hover:border-ring/60 hover:bg-muted/50"}`}><span className="flex items-start gap-3"><span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary" : "border-muted-foreground/50"}`}>{selected && <span className="size-1.5 rounded-full bg-primary-foreground" />}</span><span><span className="block text-sm font-semibold text-foreground">{title}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span></span></span></button>;
}

function SelectField({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <div><label className="text-sm text-foreground" htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${input} mt-2`} >{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}

function ComboField({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  const listId = `${id}-options`;
  return (
    <div>
      <label className="text-sm text-foreground" htmlFor={id}>{label}</label>
      <input id={id} list={listId} value={value} onChange={(event) => onChange(event.target.value)} className={`${input} mt-2`} />
      <datalist id={listId}>{options.map((option) => <option key={option} value={option} />)}</datalist>
    </div>
  );
}
