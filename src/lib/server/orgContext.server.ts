/**
 * Resolves who the caller is and what they are allowed to do, on the server.
 *
 * Every server function that touches organization-scoped data calls this
 * first. Row Level Security is the enforcement floor; these checks give
 * useful errors instead of empty result sets, and stop a request before it
 * writes anything it is not allowed to write.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Client = SupabaseClient<Database>;

export type AppRole = "admin" | "educator" | "learner";

export interface Caller {
  userId: string;
  email: string | null;
  displayName: string | null;
  status: string;
  /** Platform-level roles from `user_roles`. */
  platformRoles: AppRole[];
  isPlatformAdmin: boolean;
  organizationId: string | null;
  organizationName: string | null;
  organizationRole: AppRole | null;
  isOrgAdmin: boolean;
  isOrgOwner: boolean;
  /** All active organization ids, for admin/research listing. */
  organizationIds: string[];
}

export class PermissionError extends Error {
  readonly code = "permission_denied";
  constructor(message = "You do not have permission to do that.") {
    super(message);
  }
}

export async function resolveCaller(supabase: Client, userId: string): Promise<Caller> {
  const [{ data: profile }, { data: roles }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("email, display_name, status").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("organization_memberships")
      .select("organization_id, role, is_owner, status, organizations(name)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at"),
  ]);

  const rows = (memberships ?? []) as unknown as {
    organization_id: string;
    role: AppRole;
    is_owner: boolean;
    organizations: { name: string } | null;
  }[];
  const primary = rows[0] ?? null;
  const platformRoles = ((roles ?? []) as { role: AppRole }[]).map((r) => r.role);
  const prof = (profile ?? null) as { email?: string | null; display_name?: string | null; status?: string } | null;

  return {
    userId,
    email: prof?.email ?? null,
    displayName: prof?.display_name ?? null,
    status: prof?.status ?? "active",
    platformRoles,
    isPlatformAdmin: platformRoles.includes("admin"),
    organizationId: primary?.organization_id ?? null,
    organizationName: primary?.organizations?.name ?? null,
    organizationRole: primary?.role ?? null,
    isOrgAdmin: Boolean(primary && (primary.is_owner || primary.role === "admin")),
    isOrgOwner: Boolean(primary?.is_owner),
    organizationIds: rows.map((r) => r.organization_id),
  };
}

/** Caller must be able to author simulations (educator or admin). */
export function requireAuthoring(caller: Caller): string {
  if (caller.status !== "active") throw new PermissionError("This account is not active.");
  if (!caller.organizationId) throw new PermissionError("Your account is not attached to an organization yet.");
  if (caller.organizationRole === "learner" && !caller.isPlatformAdmin) {
    throw new PermissionError("Only educators and designers can author simulations.");
  }
  return caller.organizationId;
}

export function requireAdmin(caller: Caller): void {
  if (!caller.isPlatformAdmin && !caller.isOrgAdmin) {
    throw new PermissionError("This area is limited to administrators and research users.");
  }
}

export function requireOrgMember(caller: Caller, organizationId: string): void {
  if (!caller.organizationIds.includes(organizationId)) {
    throw new PermissionError("That belongs to a different organization.");
  }
}
