import { useState } from "react";
import { Chip } from "@/components/AppShell";
import { FOUNDATION_RESOURCES, FOUNDATION_SUMMARY, FOUNDATION_VERSION } from "@/lib/foundation/resources";

export function FoundationPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel bg-secondary/60 p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-primary">Classroom Coach foundation</span>
        <span className="text-xs text-muted-foreground">
          {FOUNDATION_VERSION} · {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{FOUNDATION_SUMMARY}</p>
          <ul className="divide-y divide-border border-t border-border">
            {FOUNDATION_RESOURCES.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <div className="text-sm text-foreground">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.governs}</div>
                </div>
                <Chip tone="accent">{r.status}</Chip>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            These resources are maintained by the Classroom Coach research team and are not edited here.
          </p>
        </div>
      )}
      {!open && (
        <div className="mt-3 flex flex-wrap gap-2">
          {FOUNDATION_RESOURCES.map((r) => (
            <Chip key={r.id}>{r.name} · Active</Chip>
          ))}
        </div>
      )}
    </div>
  );
}
