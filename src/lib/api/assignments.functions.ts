import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface GroupRow {
  id: string;
  name: string;
  description: string;
}

export interface AssignmentRow {
  id: string;
  title: string;
  instructions: string;
  status: string;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  group_id: string | null;
  group_name: string | null;
  scenario_version_id: string | null;
  version_label: string | null;
  scenario_id: string | null;
  scenario_title: string | null;
}

export const listGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("courses_or_groups")
      .select("id, name, description")
      .is("archived_at", null)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as GroupRow[];
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description?: string }) => input)
  .handler(async ({ data, context }) => {
    const { resolveCaller, requireAuthoring } = await import("../server/orgContext.server");
    const { writeAudit } = await import("../server/audit.server");
    const caller = await resolveCaller(context.supabase, context.userId);
    const organizationId = requireAuthoring(caller);
    const name = data.name.trim();
    if (!name) throw new Error("Give the course or group a name.");

    const { data: row, error } = await context.supabase
      .from("courses_or_groups")
      .insert({
        owner_id: context.userId,
        created_by: context.userId,
        organization_id: organizationId,
        name,
        description: data.description?.trim() ?? "",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const id = (row as { id: string }).id;
    await writeAudit(context.supabase, {
      action: "group.created",
      objectType: "group",
      objectId: id,
      organizationId,
      actorId: context.userId,
      actorEmail: caller.email,
      metadata: { name },
    });
    return { id };
  });

export const listAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scenarioId?: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("assignments")
      .select(
        "id, title, instructions, status, opens_at, closes_at, created_at, group_id, scenario_version_id, courses_or_groups(name), scenario_versions(version_label, scenario_id, scenarios(title))",
      )
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const mapped = ((rows ?? []) as unknown as {
      id: string;
      title: string;
      instructions: string;
      status: string;
      opens_at: string | null;
      closes_at: string | null;
      created_at: string;
      group_id: string | null;
      scenario_version_id: string | null;
      courses_or_groups: { name: string } | null;
      scenario_versions: { version_label: string; scenario_id: string; scenarios: { title: string } | null } | null;
    }[]).map((a) => ({
      id: a.id,
      title: a.title,
      instructions: a.instructions,
      status: a.status,
      opens_at: a.opens_at,
      closes_at: a.closes_at,
      created_at: a.created_at,
      group_id: a.group_id,
      group_name: a.courses_or_groups?.name ?? null,
      scenario_version_id: a.scenario_version_id,
      version_label: a.scenario_versions?.version_label ?? null,
      scenario_id: a.scenario_versions?.scenario_id ?? null,
      scenario_title: a.scenario_versions?.scenarios?.title ?? null,
    })) satisfies AssignmentRow[];

    return data.scenarioId ? mapped.filter((a) => a.scenario_id === data.scenarioId) : mapped;
  });

export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      scenarioId: string;
      scenarioVersionId: string;
      groupId?: string;
      title: string;
      instructions?: string;
      opensAt?: string;
      closesAt?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { resolveCaller, requireAuthoring } = await import("../server/orgContext.server");
    const { writeAudit } = await import("../server/audit.server");
    const caller = await resolveCaller(context.supabase, context.userId);
    const organizationId = requireAuthoring(caller);

    const title = data.title.trim();
    if (!title) throw new Error("Give the assignment a title learners will recognise.");

    const { data: version } = await context.supabase
      .from("scenario_versions")
      .select("id, scenario_id")
      .eq("id", data.scenarioVersionId)
      .maybeSingle();
    const versionRow = (version ?? null) as { id: string; scenario_id: string } | null;
    if (!versionRow || versionRow.scenario_id !== data.scenarioId) {
      throw new Error("Publish a version of this simulation before assigning it.");
    }

    const { data: row, error } = await context.supabase
      .from("assignments")
      .insert({
        owner_id: context.userId,
        organization_id: organizationId,
        scenario_version_id: data.scenarioVersionId,
        group_id: data.groupId ?? null,
        title,
        instructions: data.instructions?.trim() ?? "",
        status: "open",
        opens_at: data.opensAt || null,
        closes_at: data.closesAt || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const id = (row as { id: string }).id;
    await writeAudit(context.supabase, {
      action: "assignment.created",
      objectType: "assignment",
      objectId: id,
      objectVersionId: data.scenarioVersionId,
      organizationId,
      actorId: context.userId,
      actorEmail: caller.email,
      metadata: { title, group_id: data.groupId ?? null },
    });
    return { id };
  });

export const closeAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { resolveCaller } = await import("../server/orgContext.server");
    const { writeAudit } = await import("../server/audit.server");
    const caller = await resolveCaller(context.supabase, context.userId);

    const { error } = await context.supabase.from("assignments").update({ status: "closed" }).eq("id", data.id);
    if (error) throw new Error(error.message);

    await writeAudit(context.supabase, {
      action: "assignment.updated",
      objectType: "assignment",
      objectId: data.id,
      organizationId: caller.organizationId,
      actorId: context.userId,
      actorEmail: caller.email,
      metadata: { status: "closed" },
    });
    return { ok: true };
  });
