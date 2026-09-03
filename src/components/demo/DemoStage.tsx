import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEMO_CAST,
  DEMO_PROVENANCE,
  DEMO_RELATIONSHIPS,
  DEMO_REVIEW,
  DEMO_SCRIPT,
  DESIGN_FIELDS,
  phaseOf,
  type DemoStep,
  type DemoVoice,
  type DesignField,
} from "@/lib/demo/script";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** True when the viewport is a tall/narrow surface (phone in portrait). */
export function usePortraitStage(override?: "phone" | "desktop") {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    if (override) return;
    const mq = window.matchMedia("(max-width: 700px), (orientation: portrait) and (max-width: 900px)");
    setPortrait(mq.matches);
    const onChange = () => setPortrait(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [override]);
  if (override) return override === "phone";
  return portrait;
}

/** Advances through the script on timers and loops back to the start. */
function useDemoPlayer(reduced: boolean) {
  const [index, setIndex] = useState(0);
  const [loop, setLoop] = useState(0);
  const [fading, setFading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const step = DEMO_SCRIPT[index];
    if (!step) return;
    const ms = reduced ? Math.min(step.ms, 1200) : step.ms;
    timer.current = setTimeout(() => {
      if (index >= DEMO_SCRIPT.length - 1) {
        setFading(true);
        setTimeout(() => {
          setIndex(0);
          setLoop((n) => n + 1);
          setFading(false);
        }, 900);
      } else {
        setIndex((i) => i + 1);
      }
    }, ms);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [index, reduced]);

  return { index, loop, fading };
}

function useTypedText(text: string, active: boolean, reduced: boolean) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, [text, active, reduced]);
  return active ? shown : text;
}

const card = "rounded-md border border-border bg-card";

function Caption({ text, compact }: { text: string; compact: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 flex justify-center ${compact ? "pb-4" : "pb-5"}`}>
      <div
        className={`mx-4 rounded-full border border-border bg-secondary/95 text-center font-medium tracking-wide text-secondary-foreground shadow-sm ${
          compact ? "px-4 py-2 text-[13px]" : "px-5 py-2 text-[13px]"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function PhaseRail({ phase, compact }: { phase: string; compact: boolean }) {
  const steps = [
    { key: "design", label: "Design", short: "Design" },
    { key: "build", label: "Build", short: "Build" },
    { key: "spec", label: "Review scenario", short: "Scenario" },
    { key: "rehearse", label: "Rehearse", short: "Rehearse" },
    { key: "review", label: "Reflect", short: "Reflect" },
  ];
  const active = steps.findIndex((s) => s.key === phase);

  if (compact) {
    return (
      <div className="border-b border-border bg-card px-4 pb-2.5 pt-3">
        <div className="font-[family-name:var(--font-display)] text-[11px] font-semibold tracking-[0.16em] text-primary">
          CLASSROOM COACH
        </div>
        <div className="mt-2 flex items-center gap-1">
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={`rounded-sm px-2 py-1 text-[10px] tracking-wide transition-colors duration-500 ${
                i === active
                  ? "bg-primary text-primary-foreground"
                  : i < active
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {s.short}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-8 py-3">
      <div className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.14em] text-primary">
        CLASSROOM COACH
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className={`rounded-sm px-2.5 py-1 text-[11px] tracking-wide transition-colors duration-500 ${
                i === active ? "bg-primary text-primary-foreground" : i < active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="h-px w-4 bg-border" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignPanel({ chosen, compact }: { chosen: Partial<Record<DesignField, string>>; compact: boolean }) {
  if (compact) {
    return (
      <div className="flex h-full flex-col gap-2.5 overflow-hidden px-4 py-4">
        {DESIGN_FIELDS.map((f) => (
          <div key={f.field} className={`${card} p-3`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{f.label}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.options.map((o) => {
                const on = chosen[f.field] === o;
                return (
                  <span
                    key={o}
                    className={`rounded-sm border px-2 py-1 text-[11px] leading-tight transition-all duration-300 ${
                      on
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {o}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-5 px-8 py-7">
      {DESIGN_FIELDS.map((f) => (
        <div key={f.field} className={`${card} p-4`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{f.label}</div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {f.options.map((o) => {
              const on = chosen[f.field] === o;
              return (
                <span
                  key={o}
                  className={`rounded-sm border px-2.5 py-1.5 text-xs transition-all duration-300 ${
                    on
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {o}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const BUILD_STAGES = ["Saving your setup", "Reading your documents", "Deriving the people, relationships, and opening moment"];

function BuildPanel({ stage, compact }: { stage: string; compact: boolean }) {
  const i = Math.max(0, BUILD_STAGES.indexOf(stage));
  const pct = ((i + 1) / BUILD_STAGES.length) * 100;
  return (
    <div className={`flex h-full flex-col justify-center ${compact ? "px-6 py-8" : "px-16 py-10"}`}>
      <div className={`font-semibold tracking-tight text-primary ${compact ? "text-base" : "text-lg"}`}>
        Building your scenario
      </div>
      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-6 space-y-2.5">
        {BUILD_STAGES.map((s, n) => (
          <li key={s} className={`flex items-start gap-2.5 ${compact ? "text-[13px]" : "text-sm"}`}>
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-500 ${n <= i ? "bg-primary" : "bg-border"}`}
            />
            <span className={n <= i ? "text-foreground" : "text-muted-foreground"}>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CastBlock() {
  return (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Who is in the room</div>
      <div className="mt-3 space-y-3">
        {DEMO_CAST.map((p) => (
          <div key={p.name} className="border-l-2 border-accent pl-3">
            <div className="text-sm font-semibold text-foreground">
              {p.name} <span className="font-normal text-muted-foreground">— {p.role}</span>
            </div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Wants: {p.goal} · Worried about: {p.concern}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RelationshipsBlock() {
  return (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        What is already between them
      </div>
      <div className="mt-3 space-y-2">
        {DEMO_RELATIONSHIPS.map((r) => (
          <div key={r.between} className="text-xs text-foreground">
            <span className="font-semibold">{r.between}</span> — {r.nature}{" "}
            <span className="text-muted-foreground">(tension: {r.tension})</span>
          </div>
        ))}
      </div>
    </>
  );
}

function OpeningBlock() {
  return (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Opening moment</div>
      <p className="mt-3 text-xs leading-relaxed text-foreground">
        Aisha is standing. Ben is talking past her to the room. The bell has already gone.
      </p>
    </>
  );
}

function ProvenanceBlock() {
  return (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Where this came from</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {DEMO_PROVENANCE.map((p) => (
          <span key={p} className="rounded-sm border border-border bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">
            {p}
          </span>
        ))}
      </div>
    </>
  );
}

function SpecPanel({ parts, compact }: { parts: Set<string>; compact: boolean }) {
  if (compact) {
    // Only the block being revealed is on screen, so nothing gets squeezed.
    const current = parts.has("opening") ? "opening" : parts.has("relationships") ? "relationships" : "cast";
    return (
      <div className="flex h-full flex-col gap-3 px-4 py-4">
        {current === "cast" && <div className={`${card} p-4`}>{<CastBlock />}</div>}
        {current === "relationships" && <div className={`${card} p-4`}>{<RelationshipsBlock />}</div>}
        {current === "opening" && (
          <>
            <div className={`${card} p-4`}>{<OpeningBlock />}</div>
            <div className={`${card} p-4`}>{<ProvenanceBlock />}</div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-5 px-8 py-7">
      <div className="col-span-3 space-y-4">
        <div className={`${card} p-4 transition-opacity duration-700 ${parts.has("cast") ? "opacity-100" : "opacity-0"}`}>
          <CastBlock />
        </div>
        <div className={`${card} p-4 transition-opacity duration-700 ${parts.has("relationships") ? "opacity-100" : "opacity-0"}`}>
          <RelationshipsBlock />
        </div>
      </div>
      <div className="col-span-2 space-y-4">
        <div className={`${card} p-4 transition-opacity duration-700 ${parts.has("opening") ? "opacity-100" : "opacity-0"}`}>
          <OpeningBlock />
        </div>
        <div className={`${card} p-4 transition-opacity duration-700 ${parts.has("opening") ? "opacity-100" : "opacity-0"}`}>
          <ProvenanceBlock />
        </div>
      </div>
    </div>
  );
}

type Beat =
  | { type: "voices"; voices: DemoVoice[]; observation: string }
  | { type: "educator"; text: string; typing: boolean }
  | { type: "scene"; label: string; present: string[] }
  | {
      type: "read";
      read: { improving: string[]; strained: string[]; revealed: string[] };
      trajectory: "settling" | "holding" | "escalating";
    }
  | { type: "closing" };

function VoiceBlock({ voices, observation }: { voices: DemoVoice[]; observation: string }) {
  return (
    <div className={`${card} p-4`}>
      <div className="space-y-3">
        {voices.map((v, i) => (
          <div key={i}>
            <div className="text-xs font-semibold tracking-wide text-primary">
              {v.name} <span className="font-normal italic text-muted-foreground">({v.cue})</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-foreground">“{v.line}”</p>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed italic text-muted-foreground">{observation}</p>
    </div>
  );
}

function ReadStrip({ read, trajectory }: Extract<Beat, { type: "read" }>) {
  const tone =
    trajectory === "settling"
      ? "border-[color:var(--color-chart-2)] text-foreground"
      : trajectory === "escalating"
        ? "border-destructive text-foreground"
        : "border-border text-muted-foreground";
  return (
    <div className="flex flex-wrap items-center gap-2 pl-1">
      <span className={`rounded-full border px-2.5 py-1 text-[11px] tracking-wide ${tone}`}>Room is {trajectory}</span>
      {read.improving.map((t) => (
        <span key={t} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">
          ↑ {t}
        </span>
      ))}
      {read.strained.map((t) => (
        <span key={t} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">
          ↓ {t}
        </span>
      ))}
      {read.revealed.map((t) => (
        <span key={t} className="rounded-full border border-accent bg-accent px-2.5 py-1 text-[11px] text-accent-foreground">
          Revealed — {t}
        </span>
      ))}
    </div>
  );
}

function RehearsePanel({
  beats,
  scene,
  compact,
}: {
  beats: Beat[];
  scene: { label: string; present: string[] };
  compact: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [beats.length]);

  const visible = beats.slice(compact ? -3 : -5);

  return (
    <div className="flex h-full flex-col">
      <div
        className={`border-b border-border bg-secondary/60 ${
          compact ? "space-y-0.5 px-4 py-2" : "flex items-center justify-between px-8 py-2.5"
        }`}
      >
        <div className="text-xs text-secondary-foreground">
          <span className="font-semibold">Scene:</span> {scene.label}
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-secondary-foreground">In the room:</span> {scene.present.join(", ")}
        </div>
      </div>
      <div className={`flex-1 space-y-3 overflow-hidden ${compact ? "px-4 py-4 pb-16" : "px-8 py-5"}`}>
        {visible.map((b, i) => {
          if (b.type === "voices") return <VoiceBlock key={i} voices={b.voices} observation={b.observation} />;
          if (b.type === "read") return <ReadStrip key={i} {...b} />;
          if (b.type === "scene")
            return (
              <div key={i} className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Scene change — {b.label}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            );
          if (b.type === "closing")
            return (
              <div key={i} className={`${card} border-primary/30 bg-secondary p-4`}>
                <div className="text-sm font-semibold text-primary">This rehearsal has reached a close.</div>
                <div className="mt-2 inline-block rounded-sm bg-primary px-3 py-2 text-xs text-primary-foreground">
                  Close out this rehearsal and see your review
                </div>
              </div>
            );
          return (
            <div key={i} className="flex justify-end">
              <div className={`rounded-md bg-primary px-4 py-3 ${compact ? "max-w-[90%]" : "max-w-[75%]"}`}>
                <div className="text-[11px] uppercase tracking-[0.1em] text-primary-foreground/70">Your move</div>
                <p className="mt-1 text-sm leading-relaxed text-primary-foreground">
                  {b.text}
                  {b.typing && <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-primary-foreground align-middle" />}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}

/** In portrait the review is revealed in sequence so the panel never overflows. */
function useRevealSteps(count: number, ms: number, enabled: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    setN(0);
    const id = setInterval(() => setN((v) => (v >= count ? v : v + 1)), ms);
    return () => clearInterval(id);
  }, [count, ms, enabled]);
  return enabled ? n : count;
}

function ReviewPanel({ compact }: { compact: boolean }) {
  const revealed = useRevealSteps(DEMO_REVIEW.sections.length + 1, 1600, compact);

  if (compact) {
    return (
      <div className="flex h-full flex-col gap-3 overflow-hidden px-4 py-4 pb-16">
        <div className={`${card} p-4`}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">After-action review</div>
          <p className="mt-2 text-[13px] leading-relaxed text-foreground">{DEMO_REVIEW.summary}</p>
        </div>
        {DEMO_REVIEW.sections.slice(Math.max(0, revealed - 2), revealed).map((s) => (
          <div key={s.title} className={`${card} p-3.5`}>
            <div className="text-xs font-semibold text-primary">{s.title}</div>
            <ul className="mt-2 space-y-1.5">
              {s.items.map((it) => (
                <li key={it} className="text-[12px] leading-relaxed text-foreground">
                  · {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {revealed > DEMO_REVIEW.sections.length && (
          <div className={`${card} p-3.5`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Instructor feedback</div>
            <div className="mt-2 text-xs font-semibold text-foreground">{DEMO_REVIEW.feedback.author}</div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{DEMO_REVIEW.feedback.text}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-5 gap-5 px-8 py-7">
      <div className="col-span-3 space-y-4">
        <div className={`${card} p-5`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">After-action review</div>
          <p className="mt-3 text-sm leading-relaxed text-foreground">{DEMO_REVIEW.summary}</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {DEMO_REVIEW.sections.map((s) => (
            <div key={s.title} className={`${card} p-4`}>
              <div className="text-xs font-semibold text-primary">{s.title}</div>
              <ul className="mt-2 space-y-1.5">
                {s.items.map((it) => (
                  <li key={it} className="text-xs leading-relaxed text-foreground">
                    · {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-2">
        <div className={`${card} p-4`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Instructor feedback</div>
          <div className="mt-3 text-xs font-semibold text-foreground">{DEMO_REVIEW.feedback.author}</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{DEMO_REVIEW.feedback.text}</p>
        </div>
      </div>
    </div>
  );
}

export function DemoStage({ compact = false }: { compact?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const { index, loop, fading } = useDemoPlayer(reduced);
  const step = DEMO_SCRIPT[index] as DemoStep;
  const phase = phaseOf(step);
  const played = useMemo(() => DEMO_SCRIPT.slice(0, index + 1), [index]);

  const chosen: Partial<Record<DesignField, string>> = {};
  const parts = new Set<string>();
  const beats: Beat[] = [];
  let scene = { label: "Middle-grades classroom, end of period", present: ["Aisha", "Ben"] };
  let buildStage = BUILD_STAGES[0] ?? "Saving your setup";

  for (const s of played) {
    if (s.kind === "design-select") chosen[s.field] = s.value;
    if (s.kind === "build") buildStage = s.stage;
    if (s.kind === "spec-reveal") parts.add(s.part);
    if (s.kind === "opening") beats.push({ type: "voices", voices: s.voices, observation: s.observation });
    if (s.kind === "educator") beats.push({ type: "educator", text: s.text, typing: s === step });
    if (s.kind === "scene") {
      beats.push({ type: "scene", label: s.label, present: s.present });
      scene = { label: s.label, present: s.present };
    }
    if (s.kind === "response") {
      beats.push({ type: "voices", voices: s.voices, observation: s.observation });
      beats.push({ type: "read", read: s.read, trajectory: s.trajectory });
    }
    if (s.kind === "closing") beats.push({ type: "closing" });
  }

  const typing = step.kind === "educator";
  const typedText = useTypedText(typing ? step.text : "", typing, reduced);
  const renderedBeats = beats.map((b, i) =>
    typing && i === beats.length - 1 && b.type === "educator" ? { ...b, text: typedText } : b,
  );

  const frame = compact
    ? "relative h-[100dvh] w-full overflow-hidden bg-background"
    : "relative aspect-video w-full max-w-[1180px] overflow-hidden rounded-lg border border-border bg-background shadow-sm";

  return (
    <div
      key={loop}
      className={`${frame} transition-opacity duration-700 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <PhaseRail phase={phase} compact={compact} />
      <div className={compact ? "h-[calc(100%-64px)]" : "h-[calc(100%-49px)]"}>
        {phase === "design" && <DesignPanel chosen={chosen} compact={compact} />}
        {phase === "build" && <BuildPanel stage={buildStage} compact={compact} />}
        {phase === "spec" && <SpecPanel parts={parts} compact={compact} />}
        {phase === "rehearse" && <RehearsePanel beats={renderedBeats} scene={scene} compact={compact} />}
        {phase === "review" && <ReviewPanel compact={compact} />}
      </div>
      <Caption text={step.caption} compact={compact} />
    </div>
  );
}
