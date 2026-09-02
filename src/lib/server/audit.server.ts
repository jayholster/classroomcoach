/**
 * Audit log for administrative and authoring actions.
 *
 * Separate from `simulation_events`: this records who changed the system,
 * not what happened inside a rehearsal. Writes never block the caller's
 * work — a failed audit write is logged, not thrown.
 */

import type { Client } from "./orgContext.server";
import { logEvent } from "./logger.server";

export type AuditAction =
  | "scenario.created"
  | "scenario.revised"
  | "scenario.published"
  | "scenario.archived"
  | "scenario.deleted"
  | "foundation.changed"
  | "assignment.created"
  | "assignment.updated"
  | "group.created"
  | "group.member_added"
  | "group.member_removed"
  | "group.invited"
  | "model_configuration.changed"
  | "document.uploaded"
  | "document.deleted"
  | "document.reprocessed"
  | "export.generated"
  | "research.exported"
  | "research.snapshot_created"
  | "research.settings_updated"
  | "assurance.run"
  | "account.deletion_requested";

export interface AuditInput {
  action: AuditAction;
  objectType: string;
  objectId?: string | null;
  objectVersionId?: string | null;
  organizationId?: string | null;
  actorId: string;
  actorEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(supabase: Client, input: AuditInput): Promise<void> {
  const { error } = await supabase.from("audit_events").insert({
    action: input.action,
    object_type: input.objectType,
    object_id: input.objectId ?? null,
    object_version_id: input.objectVersionId ?? null,
    organization_id: input.organizationId ?? null,
    actor_id: input.actorId,
    actor_email: input.actorEmail ?? null,
    metadata: (input.metadata ?? {}) as never,
  });
  if (error) {
    logEvent({
      kind: "audit.write",
      outcome: "failure",
      errorKind: "database",
      message: error.message,
      organizationId: input.organizationId ?? null,
    });
  }
}
