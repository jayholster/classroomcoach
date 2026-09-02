import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { appConfig, isProduction } from "@/lib/config";
import { getMe } from "@/lib/api/admin.functions";

const NAV = [
  { to: "/library", label: "Library", roles: ["educator", "admin"] },
  { to: "/design", label: "Design Lab", roles: ["educator", "admin"] },
  { to: "/rehearse", label: "Rehearse", roles: ["educator", "admin", "learner"] },
  { to: "/review", label: "Review", roles: ["educator", "admin", "learner"] },
  { to: "/assurance", label: "Assurance", roles: ["admin"] },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const navigate = useNavigate();
  const me = useServerFn(getMe);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => me(), enabled: Boolean(user), staleTime: 300_000 });

  // Until roles load, show the full set an educator sees; the server and RLS
  // remain the real gate, so a wrong guess here can never grant access.
  const roles = meQuery.data?.roles ?? ["educator"];
  const visibleNav = NAV.filter((n) => n.roles.some((r) => roles.includes(r)));

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      {!isProduction && (
        <div className="bg-accent px-6 py-1.5 text-center text-xs text-accent-foreground">
          {appConfig.environment === "staging" ? "Staging environment" : "Development environment"} — do not enter
          information about real students.
        </div>
      )}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <div className="text-lg font-semibold tracking-tight text-primary">CLASSROOM COACH</div>
            <div className="text-sm text-muted-foreground">Configurable professional rehearsal</div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-xs text-muted-foreground">{user.email}</span>
                <button
                  onClick={() => void signOut()}
                  className="rounded-sm border border-input px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" className="rounded-sm border border-input px-2 py-1.5 text-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
        <nav aria-label="Primary" className="mx-auto flex max-w-6xl gap-6 px-6">
          {visibleNav.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={`-mb-px border-b-2 pb-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
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
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-10">
        {children}
      </main>
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

export function Drawer({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-primary/20" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 outline-none"
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

export function DetailList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mb-4">
      <h4 className="text-xs uppercase tracking-wide text-muted-foreground">{label}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
        {items.length ? (
          items.map((i) => <li key={i}>{i}</li>)
        ) : (
          <li className="text-muted-foreground">None recorded</li>
        )}
      </ul>
    </div>
  );
}

export const btn =
  "inline-flex items-center justify-center rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50";
export const btnPrimary =
  "inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50";
export const input =
  "w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring";
