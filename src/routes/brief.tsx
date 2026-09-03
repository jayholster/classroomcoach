import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";


export const Route = createFileRoute("/brief")({
  component: PartnerBrief,
  head: () => ({
    meta: [
      { title: "Classroom Coach — Partner Brief" },
      {
        name: "description",
        content:
          "One-page partner brief: Classroom Coach is a Penn State-developed platform for low-stakes rehearsal of difficult professional situations.",
      },
      { property: "og:title", content: "Classroom Coach — Partner Brief" },
      {
        property: "og:description",
        content:
          "Practice difficult professional moments before they happen. A one-page brief for prospective partner organizations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const PRINT_CSS = `
@page { size: 8.5in 11in; margin: 0; }
@media print {
  html, body { background: #fff !important; }
  .no-print { display: none !important; }
  .brief-sheet { width: 8.5in; height: 11in; box-shadow: none !important; margin: 0 !important; page-break-after: avoid; }
}
`;

function Arrow() {
  return <span aria-hidden className="px-1 text-[9pt] text-muted-foreground">&#8594;</span>;
}

function Step({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex-1">
      <div className="border-t-2 border-brand pt-1.5 text-[7.6pt] font-semibold leading-tight tracking-[0.06em] text-primary">
        {label}
      </div>
      {sub ? <div className="mt-1 text-[6.4pt] leading-snug text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function PartnerBrief() {
  return (
    <div className="min-h-screen bg-muted py-8 print:bg-background print:py-0">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="no-print mx-auto mb-6 flex max-w-[8.5in] items-center justify-between px-2">
        <p className="text-xs text-muted-foreground">
          Print or save as PDF at 8.5 × 11 in, no margins, background graphics on.
        </p>
        <button
          onClick={() => window.print()}
          className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold tracking-wide text-primary-foreground"
        >
          Download PDF
        </button>
      </div>

      <article
        className="brief-sheet mx-auto flex h-[11in] w-[8.5in] flex-col bg-card font-[family-name:var(--font-sans)] text-foreground shadow-md print:shadow-none"
        aria-label="Classroom Coach partner brief"
      >
        {/* Header */}
        <header className="bg-primary px-[0.7in] pb-4 pt-5 text-primary-foreground">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-[24pt] font-semibold leading-none tracking-[0.06em]">
                CLASSROOM COACH
              </h1>
              <p className="mt-2 font-[family-name:var(--font-display)] text-[11.5pt] leading-snug text-primary-foreground/95">
                Practice difficult professional moments before they happen.
              </p>
              <p className="mt-1.5 max-w-[5.4in] text-[8pt] leading-relaxed text-primary-foreground/75">
                Classroom Coach is a Penn State-developed platform for low-stakes rehearsal of difficult teaching,
                facilitation, and professional situations.
              </p>
            </div>
            <div className="mt-1 shrink-0 border border-primary-foreground/25 px-2.5 py-1.5 text-right text-[6pt] uppercase leading-tight tracking-[0.14em] text-primary-foreground/70">
              Proposed NSF
              <br />
              Translation to
              <br />
              Practice Project
            </div>
          </div>
        </header>

        <div className="flex-1 px-[0.7in] py-4">
          {/* Section 1 */}
          <section>
            <h2 className="text-[8pt] font-semibold uppercase tracking-[0.16em] text-brand">What Classroom Coach does</h2>
            <p className="mt-1.5 text-[8pt] leading-snug">
              Participants enter an unfolding situation and respond naturally in their own words. Simulated people
              respond, relationships and circumstances change, and the situation can improve, deteriorate, or become
              more complicated based on what happens.
            </p>
            <p className="mt-1 text-[8pt] leading-snug text-muted-foreground">
              Classroom Coach began in teacher preparation and is now being developed for use across education,
              informal learning, community, and workforce settings.
            </p>

            <div className="mt-3 flex items-start gap-1">
              <Step label="WHAT SHOULD PEOPLE PRACTICE?" />
              <Arrow />
              <Step label="ADD LOCAL CONTEXT" sub="Policies • procedures • curriculum • program expectations • local knowledge" />
              <Arrow />
              <Step label="REVIEW & CUSTOMIZE" />
              <Arrow />
              <Step label="REHEARSE" />
              <Arrow />
              <Step label="REFLECT & REVISE" />
            </div>
          </section>

          {/* Section 2 */}
          <section className="mt-4 border border-border bg-secondary/60 px-5 py-3">
            <h2 className="text-[8pt] font-semibold uppercase tracking-[0.16em] text-brand">
              Built around your professional context
            </h2>
            <div className="mt-1.5 flex gap-5">
              <div className="flex-[1.6]">
                <p className="text-[8.4pt] leading-relaxed">
                  Every organization has situations that experienced people learn how to navigate over time. Classroom
                  Coach helps turn that professional knowledge into opportunities for practice.
                </p>
                <p className="mt-1.5 text-[8.4pt] leading-relaxed">
                  Organizations identify the situations people need to rehearse and provide the context that should
                  shape them—such as policies, procedures, curriculum, program expectations, professional standards, or
                  local practices. Classroom Coach combines that context with its simulation framework to create an
                  unfolding situation the organization can review, customize, test, and reuse.
                </p>
              </div>
              <div className="flex-1 border-l border-border pl-6">
                <ul className="space-y-1 text-[8pt] font-semibold tracking-[0.05em] text-primary">
                  <li>YOUR EXPERTISE</li>
                  <li className="text-muted-foreground">+</li>
                  <li>YOUR CONTEXT</li>
                  <li className="text-muted-foreground">+</li>
                  <li>CLASSROOM COACH</li>
                  <li className="text-muted-foreground">=</li>
                  <li className="text-brand">A REHEARSAL PEOPLE CAN PRACTICE</li>
                </ul>
                <p className="mt-2 text-[7pt] text-muted-foreground">
                  No prompt writing or simulation programming required.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mt-4">
            <h2 className="text-[8pt] font-semibold uppercase tracking-[0.16em] text-brand">What could people rehearse?</h2>
            <div className="mt-2 grid grid-cols-4 gap-4">
              {[
                ["DIFFICULT CONVERSATIONS", "Responding to conflict, criticism, embarrassment, exclusion, or disagreement."],
                ["PROFESSIONAL JUDGMENT", "Making decisions when policies, learner needs, organizational expectations, and incomplete information compete."],
                ["FACILITATION", "Managing participation, inquiry, safety, competing needs, or group dynamics."],
                ["WORKFORCE & PROFESSIONAL READINESS", "Responding to feedback, communicating with supervisors or colleagues, navigating unfamiliar professional situations."],
              ].map(([t, d]) => (
                <div key={t} className="border-t border-border pt-1.5">
                  <div className="text-[7.4pt] font-semibold leading-tight tracking-[0.05em] text-primary">{t}</div>
                  <p className="mt-1 text-[7pt] leading-snug text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4 */}
          <section className="mt-4 border-y-2 border-brand py-3">
            <h2 className="font-[family-name:var(--font-display)] text-[12.5pt] font-semibold leading-snug text-primary">
              What does your organization know how to handle that you wish people could practice before they encounter
              it for real?
            </h2>
            <div className="mt-2 flex gap-5">
              <p className="w-[1.5in] shrink-0 text-[7.6pt] leading-snug text-muted-foreground">
                We are looking for partners who can help us understand:
              </p>
              <ul className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 text-[7.6pt] leading-snug">
                {[
                  "What situations are hardest to prepare people for?",
                  "What context would make a simulation feel authentic in your setting?",
                  "What should your organization be able to customize?",
                  "What would make people trust and actually use the experience?",
                  "What would make this useful enough to become part of real training, education, or professional learning?",
                ].map((q) => (
                  <li key={q} className="border-l border-border pl-2">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mt-4">
            <h2 className="text-[8pt] font-semibold uppercase tracking-[0.16em] text-brand">
              What participation could look like
            </h2>
            <div className="mt-1.5 flex items-start gap-2">
              {[
                ["1. CONVERSATION", "About 30 minutes. Share your needs, difficult situations, and current approaches."],
                ["2. CO-DESIGN", "Shape one or two relevant simulations. Help us make them reflect the realities of your setting."],
                ["3. PILOT", "Try Classroom Coach with a small group. Help us understand what works, what does not, and what would support broader use."],
              ].map(([t, d], i) => (
                <Fragment key={t}>
                  {i > 0 && <Arrow />}
                  <div className="flex-1 border-t-2 border-primary pt-1.5">
                    <div className="text-[7.8pt] font-semibold tracking-[0.05em] text-primary">{t}</div>
                    <p className="mt-1 text-[7pt] leading-snug text-muted-foreground">{d}</p>
                  </div>
                </Fragment>
              ))}

            </div>
            <p className="mt-2 text-[6.8pt] leading-snug text-muted-foreground">
              A smaller number of organizations may be invited to participate more substantially as implementation and
              translation partners in a proposed NSF Translation to Practice project.
            </p>
          </section>

          {/* Optional callout */}
          <aside className="mt-3 border-l-2 border-border pl-3">
            <div className="text-[6.8pt] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Preserving professional knowledge
            </div>
            <p className="mt-0.5 text-[7pt] leading-snug text-muted-foreground">
              Classroom Coach can also provide a way for experienced professionals to help shape situations that newer
              educators, facilitators, staff, or volunteers can rehearse and learn from.
            </p>
          </aside>
        </div>

        {/* Footer */}
        <footer className="mt-auto flex items-end justify-between border-t border-border px-[0.7in] py-3 text-[7.2pt] text-muted-foreground">
          <div>
            <div className="font-semibold text-primary">Jacob Holster · Penn State · Classroom Coach</div>
            <div className="mt-0.5">Email: ________________________</div>
          </div>
          <div className="text-right">
            Prototype
            <div className="font-semibold text-primary">classroomcoach.lovable.app</div>
          </div>
        </footer>
      </article>
    </div>
  );
}
