import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Chip } from "@/components/AppShell";
import { listFoundationResources } from "@/lib/api/scenarios.functions";

export function FoundationPanel() {
  const [open, setOpen] = useState(false);
  const fetchFoundation = useServerFn(listFoundationResources);
  const { data } = useQuery({ queryKey: ["foundation"], queryFn: () => fetchFoundation() });
  const resources = data ?? [];
  const version = resources[0]?.version ?? "Foundation";

  return (
    <div className="panel bg-secondary/60 p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-primary">Classroom Coach foundation</span>
        <span className="text-xs text-muted-foreground">
          {version} · {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            These expert-developed resources govern how people, relationships, scenario progression, consequences, and
            reflection behave across simulations.
          </p>
          <ul className="divide-y divide-border border-t border-border">
            {resources.map((r) => (
              <li key={r.key} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <div className="text-sm text-foreground">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.governs}</div>
                </div>
                <Chip tone="accent">Active</Chip>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            These resources are maintained by the Classroom Coach research team and are not edited here.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {resources.map((r) => (
            <Chip key={r.key}>{r.name}</Chip>
          ))}
        </div>
      )}
    </div>
  );
}
