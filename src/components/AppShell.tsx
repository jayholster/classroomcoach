import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { loadRole, saveRole, resetAll } from "@/lib/store";
import type { Role } from "@/lib/types";

const NAV = [
  { to: "/", label: "Library" },
  { to: "/design", label: "Design Lab" },
  { to: "/rehearse", label: "Rehearse" },
  { to: "/review", label: "Review" },
  { to: "/assurance", label: "Assurance" },
] as const;

const ROLES: Role[] = ["Designer / Educator", "Learner", "Admin / Research"];

export function useRole() {
  const [role, setRole] = useState<Role>("Designer / Educator");
  useEffect(() => {
    setRole(loadRole());
    const h = () => setRole(loadRole());
    window.addEventListener("cc:store", h);
    return () => window.removeEventListener("cc:store", h);
  }, []);
  return role;
}

export function AppShell({ children }: { children: ReactNode }) {
  const role = useRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <div className="text-lg font-semibold tracking-tight text-primary">CLASSROOM COACH</div>
            <div className="text-sm text-muted-foreground">Configurable professional rehearsal</div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => saveRole(e.target.value as Role)}
              className="rounded-sm border border-input bg-background px-2 py-1.5 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (confirm("Reset all prototype data?")) {
                  resetAll();
                  window.location.href = "/";
                }
              }}
              className="rounded-sm border border-input px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              Reset
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-6 px-6">
          {NAV.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`-mb-px border-b-2 pb-3 text-sm ${
                  active
                    ? "border-primary font-medium text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-muted-foreground">
        Prototype — Penn State NSF Translation to Practice project. Not affiliated with official university branding.
      </footer>
    </div>
  );
}

export function Chip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" | "warn" }) {
  const styles =
    tone === "accent"
      ? "border-ring/40 bg-accent text-accent-foreground"
      : tone === "warn"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${styles}`}>{children}</span>;
}

export function SourceChips({ sources }: { sources: string[] }) {
  if (!sources.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Derived from:</span>
      {sources.filter(Boolean).map((s) => (
        <Chip key={s} tone="accent">
          {s}
        </Chip>
      ))}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="panel mb-6 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export const btn =
  "inline-flex items-center justify-center rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50";
export const btnPrimary =
  "inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50";
export const input =
  "w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring";
