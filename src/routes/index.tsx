import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { btnPrimary } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Classroom Coach — Configurable professional rehearsal" },
      {
        name: "description",
        content:
          "Design, rehearse, and review teaching situations that are difficult to practice with real learners.",
      },
      { property: "og:title", content: "Classroom Coach — Configurable professional rehearsal" },
      {
        property: "og:description",
        content: "Educator-governed simulations built from your teaching purpose and your own context documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, ready } = useAuth();
  return (
    <div className="min-h-screen bg-background px-6 py-20 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="text-lg font-semibold tracking-tight text-primary">CLASSROOM COACH</div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-primary">
          Configurable professional rehearsal
        </h1>
        <p className="mt-5 text-base leading-relaxed text-foreground">
          State what someone should practice, add your own context, and Classroom Coach builds a structured situation
          you review and govern. Then rehearse it in the moment, and review what actually changed.
        </p>
        <div className="mt-8 flex gap-3">
          {ready && session ? (
            <Link to="/library" className={btnPrimary}>
              Open your library
            </Link>
          ) : (
            <Link to="/auth" className={btnPrimary}>
              Sign in to begin
            </Link>
          )}
        </div>
        <p className="mt-12 text-xs text-muted-foreground">
          Prototype — Penn State NSF Translation to Practice project.
        </p>
      </div>
    </div>
  );
}
