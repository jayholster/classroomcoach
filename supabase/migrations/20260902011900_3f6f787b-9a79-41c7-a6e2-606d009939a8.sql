-- =========================================================
-- Phase 1: organizations, groups, memberships, audit, usage
-- =========================================================

-- ---------- profiles: status ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ---------- organizations ----------
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  document_retention_days integer,
  session_retention_days integer,
  export_retention_days integer,
  usage_limit_usd numeric,
  usage_limit_enabled boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'educator',
  is_owner boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON public.organization_memberships(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_memberships TO authenticated;
GRANT ALL ON public.organization_memberships TO service_role;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- ---------- security definer helpers ----------
CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = _org AND m.user_id = auth.uid() AND m.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = _org AND m.user_id = auth.uid()
      AND m.status = 'active' AND (m.is_owner OR m.role = 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.org_role(_org uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.organization_memberships m
  WHERE m.organization_id = _org AND m.user_id = auth.uid() AND m.status = 'active'
  LIMIT 1
$$;

-- ---------- groups ----------
ALTER TABLE public.courses_or_groups
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.courses_or_groups(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'learner',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON public.group_memberships(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_memberships TO authenticated;
GRANT ALL ON public.group_memberships TO service_role;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.courses_or_groups(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'learner',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, email)
);
CREATE INDEX IF NOT EXISTS idx_group_invitations_email ON public.group_invitations(lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_invitations TO authenticated;
GRANT ALL ON public.group_invitations TO service_role;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships g
    WHERE g.group_id = _group AND g.user_id = auth.uid() AND g.status = 'active'
  )
$$;

-- ---------- assignments ----------
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS instructions text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_assignments_group ON public.assignments(group_id);

-- Learner read access to a published version, via an active assignment.
CREATE OR REPLACE FUNCTION public.can_access_version(_version uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.group_memberships g
      ON g.group_id = a.group_id AND g.user_id = auth.uid() AND g.status = 'active'
    WHERE a.scenario_version_id = _version
      AND a.archived_at IS NULL
      AND a.status = 'open'
      AND (a.opens_at IS NULL OR a.opens_at <= now())
      AND (a.closes_at IS NULL OR a.closes_at >= now())
  )
$$;

-- ---------- organization columns on existing data ----------
ALTER TABLE public.scenarios          ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.scenarios          ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.scenarios          ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.scenarios          ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.context_documents  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.context_documents  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.context_documents  ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE public.document_chunks    ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.scenario_versions  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.scenario_versions  ADD COLUMN IF NOT EXISTS app_release text;
ALTER TABLE public.scenario_versions  ADD COLUMN IF NOT EXISTS source_references jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.scenario_participants ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.rehearsal_sessions ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.rehearsal_sessions ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL;
ALTER TABLE public.rehearsal_sessions ADD COLUMN IF NOT EXISTS foundation_version text NOT NULL DEFAULT '';
ALTER TABLE public.rehearsal_sessions ADD COLUMN IF NOT EXISTS app_release text;
ALTER TABLE public.rehearsal_sessions ADD COLUMN IF NOT EXISTS state_seq integer NOT NULL DEFAULT 0;
ALTER TABLE public.simulation_states  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.simulation_states  ADD COLUMN IF NOT EXISTS seq integer NOT NULL DEFAULT 0;
ALTER TABLE public.simulation_events  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.simulation_events  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'complete';
ALTER TABLE public.simulation_events  ADD COLUMN IF NOT EXISTS app_release text;
ALTER TABLE public.simulation_events  ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.simulation_events  ADD COLUMN IF NOT EXISTS latency_ms integer;
ALTER TABLE public.flags              ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.assurance_runs     ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_simulation_states_session ON public.simulation_states(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_simulation_events_seq ON public.simulation_events(session_id, sequence);
CREATE INDEX IF NOT EXISTS idx_scenarios_org ON public.scenarios(organization_id);
CREATE INDEX IF NOT EXISTS idx_versions_scenario ON public.scenario_versions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_sessions_owner ON public.rehearsal_sessions(owner_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON public.simulation_events(session_id, sequence);
CREATE INDEX IF NOT EXISTS idx_chunks_scenario ON public.document_chunks(scenario_id);

-- ---------- audit / usage / reviews / foundation versions ----------
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  object_version_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_org_time ON public.audit_events(organization_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.model_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.rehearsal_sessions(id) ON DELETE SET NULL,
  scenario_id uuid REFERENCES public.scenarios(id) ON DELETE SET NULL,
  function_type text NOT NULL,
  provider_type text NOT NULL DEFAULT '',
  model_identifier text NOT NULL DEFAULT '',
  model_config_id uuid REFERENCES public.model_configurations(id) ON DELETE SET NULL,
  configuration_version integer,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  estimated_cost_usd numeric,
  attempt integer NOT NULL DEFAULT 1,
  repaired boolean NOT NULL DEFAULT false,
  success boolean NOT NULL DEFAULT true,
  error_kind text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_org_time ON public.model_usage_events(organization_id, created_at DESC);
GRANT SELECT, INSERT ON public.model_usage_events TO authenticated;
GRANT ALL ON public.model_usage_events TO service_role;
ALTER TABLE public.model_usage_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.after_action_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.rehearsal_sessions(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  synthesis jsonb NOT NULL,
  model_identifier text,
  model_provider text,
  event_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);
GRANT SELECT, INSERT, UPDATE ON public.after_action_reviews TO authenticated;
GRANT ALL ON public.after_action_reviews TO service_role;
ALTER TABLE public.after_action_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foundation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  notes text NOT NULL DEFAULT '',
  resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.foundation_versions TO authenticated;
GRANT ALL ON public.foundation_versions TO service_role;
ALTER TABLE public.foundation_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.model_configurations
  ADD COLUMN IF NOT EXISTS credentials_reference text,
  ADD COLUMN IF NOT EXISTS timeout_ms integer NOT NULL DEFAULT 120000,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_concurrency integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS input_cost_per_mtok numeric,
  ADD COLUMN IF NOT EXISTS output_cost_per_mtok numeric,
  ADD COLUMN IF NOT EXISTS configuration_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.people_profiles ADD COLUMN IF NOT EXISTS profile_version integer NOT NULL DEFAULT 1;

-- ---------- backfill: one workspace organization per existing user ----------
INSERT INTO public.organizations (id, name, slug, created_by)
SELECT gen_random_uuid(),
       coalesce(p.display_name, split_part(coalesce(p.email,'user'),'@',1)) || ' workspace',
       'ws-' || replace(p.id::text, '-', ''),
       p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_memberships m WHERE m.user_id = p.id
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.organization_memberships (organization_id, user_id, role, is_owner)
SELECT o.id, o.created_by, 'educator', true
FROM public.organizations o
WHERE o.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = o.id AND m.user_id = o.created_by
  );

UPDATE public.scenarios s SET organization_id = m.organization_id, created_by = coalesce(s.created_by, s.owner_id)
FROM public.organization_memberships m WHERE m.user_id = s.owner_id AND s.organization_id IS NULL;
UPDATE public.context_documents t SET organization_id = m.organization_id
FROM public.organization_memberships m WHERE m.user_id = t.owner_id AND t.organization_id IS NULL;
UPDATE public.document_chunks t SET organization_id = m.organization_id
FROM public.organization_memberships m WHERE m.user_id = t.owner_id AND t.organization_id IS NULL;
UPDATE public.scenario_versions t SET organization_id = m.organization_id
FROM public.organization_memberships m WHERE m.user_id = t.owner_id AND t.organization_id IS NULL;
UPDATE public.scenario_participants t SET organization_id = m.organization_id
FROM public.organization_memberships m WHERE m.user_id = t.owner_id AND t.organization_id IS NULL;
UPDATE public.rehearsal_sessions t SET organization_id = m.organization_id
FROM public.organization_memberships m WHERE m.user_id = t.owner_id AND t.organization_id IS NULL;
UPDATE public.simulation_states t SET organization_id = m.organization_id
FROM public.organization_memberships m WHERE m.user_id = t.owner_id AND t.organization_id IS NULL;
UPDATE public.simulation_events t SET organization_id = m.organization_id
FROM public.organization_memberships m WHERE m.user_id = t.owner_id AND t.organization_id IS NULL;
UPDATE public.flags t SET organization_id = m.organization_id
FROM public.organization_memberships m WHERE m.user_id = t.user_id AND t.organization_id IS NULL;
UPDATE public.courses_or_groups t SET organization_id = m.organization_id, created_by = coalesce(t.created_by, t.owner_id)
FROM public.organization_memberships m WHERE m.user_id = t.owner_id AND t.organization_id IS NULL;
UPDATE public.assignments t SET organization_id = m.organization_id
FROM public.organization_memberships m WHERE m.user_id = t.owner_id AND t.organization_id IS NULL;

INSERT INTO public.after_action_reviews (session_id, organization_id, owner_id, synthesis, event_count)
SELECT s.id, s.organization_id, s.owner_id, s.review, 0
FROM public.rehearsal_sessions s
WHERE s.review IS NOT NULL
ON CONFLICT (session_id) DO NOTHING;

INSERT INTO public.foundation_versions (version, notes, active)
SELECT DISTINCT version, 'Imported from the active foundation resources.', true
FROM public.foundation_resources
ON CONFLICT (version) DO NOTHING;

-- ---------- new users get a workspace ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  new_org uuid;
  label text;
begin
  label := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1));

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, label)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'educator') on conflict do nothing;

  insert into public.organizations (name, slug, created_by)
  values (label || ' workspace', 'ws-' || replace(new.id::text, '-', ''), new.id)
  on conflict (slug) do nothing
  returning id into new_org;

  if new_org is not null then
    insert into public.organization_memberships (organization_id, user_id, role, is_owner)
    values (new_org, new.id, 'educator', true)
    on conflict do nothing;
  end if;

  -- accept any pending group invitations addressed to this email
  update public.group_invitations gi
     set status = 'accepted', accepted_by = new.id, accepted_at = now()
   where lower(gi.email) = lower(new.email) and gi.status = 'pending' and gi.expires_at > now();

  insert into public.group_memberships (group_id, organization_id, user_id, role)
  select gi.group_id, gi.organization_id, new.id, gi.role
    from public.group_invitations gi
   where gi.accepted_by = new.id
  on conflict do nothing;

  insert into public.organization_memberships (organization_id, user_id, role)
  select distinct gi.organization_id, new.id, gi.role
    from public.group_invitations gi
   where gi.accepted_by = new.id
  on conflict do nothing;

  return new;
end; $$;

-- ---------- policies ----------
DROP POLICY IF EXISTS "own scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "own documents" ON public.context_documents;
DROP POLICY IF EXISTS "own chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "own versions read" ON public.scenario_versions;
DROP POLICY IF EXISTS "own versions insert" ON public.scenario_versions;
DROP POLICY IF EXISTS "own participants read" ON public.scenario_participants;
DROP POLICY IF EXISTS "own participants insert" ON public.scenario_participants;
DROP POLICY IF EXISTS "own sessions" ON public.rehearsal_sessions;
DROP POLICY IF EXISTS "own states" ON public.simulation_states;
DROP POLICY IF EXISTS "own events read" ON public.simulation_events;
DROP POLICY IF EXISTS "own events insert" ON public.simulation_events;
DROP POLICY IF EXISTS "own flags" ON public.flags;
DROP POLICY IF EXISTS "own groups" ON public.courses_or_groups;
DROP POLICY IF EXISTS "own assignments" ON public.assignments;
DROP POLICY IF EXISTS "read foundation" ON public.foundation_resources;

CREATE POLICY "org members read organizations" ON public.organizations
  FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY "users create organizations" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "org admins update organizations" ON public.organizations
  FOR UPDATE TO authenticated USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));

CREATE POLICY "read own memberships" ON public.organization_memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "org admins manage memberships" ON public.organization_memberships
  FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "org admins update memberships" ON public.organization_memberships
  FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "org admins remove memberships" ON public.organization_memberships
  FOR DELETE TO authenticated USING (public.is_org_admin(organization_id) AND NOT is_owner);

CREATE POLICY "groups readable by org and members" ON public.courses_or_groups
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_admin(organization_id) OR public.is_group_member(id));
CREATE POLICY "educators create groups" ON public.courses_or_groups
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_org_member(organization_id));
CREATE POLICY "group owners update groups" ON public.courses_or_groups
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_admin(organization_id))
  WITH CHECK (owner_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "group owners delete groups" ON public.courses_or_groups
  FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_org_admin(organization_id));

CREATE POLICY "group membership readable" ON public.group_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_admin(organization_id)
         OR EXISTS (SELECT 1 FROM public.courses_or_groups c WHERE c.id = group_id AND c.owner_id = auth.uid()));
CREATE POLICY "group owners add members" ON public.group_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organization_id)
              OR EXISTS (SELECT 1 FROM public.courses_or_groups c WHERE c.id = group_id AND c.owner_id = auth.uid()));
CREATE POLICY "group owners remove members" ON public.group_memberships
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id)
         OR EXISTS (SELECT 1 FROM public.courses_or_groups c WHERE c.id = group_id AND c.owner_id = auth.uid()));

CREATE POLICY "invitations readable" ON public.group_invitations
  FOR SELECT TO authenticated
  USING (public.is_org_admin(organization_id)
         OR EXISTS (SELECT 1 FROM public.courses_or_groups c WHERE c.id = group_id AND c.owner_id = auth.uid()));
CREATE POLICY "group owners invite" ON public.group_invitations
  FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid()
              AND (public.is_org_admin(organization_id)
                   OR EXISTS (SELECT 1 FROM public.courses_or_groups c WHERE c.id = group_id AND c.owner_id = auth.uid())));
CREATE POLICY "group owners revoke invitations" ON public.group_invitations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id)
         OR EXISTS (SELECT 1 FROM public.courses_or_groups c WHERE c.id = group_id AND c.owner_id = auth.uid()))
  WITH CHECK (true);
CREATE POLICY "group owners delete invitations" ON public.group_invitations
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id)
         OR EXISTS (SELECT 1 FROM public.courses_or_groups c WHERE c.id = group_id AND c.owner_id = auth.uid()));

CREATE POLICY "assignments readable" ON public.assignments
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_admin(organization_id) OR public.is_group_member(group_id));
CREATE POLICY "educators create assignments" ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_org_member(organization_id));
CREATE POLICY "educators update assignments" ON public.assignments
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_admin(organization_id))
  WITH CHECK (owner_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "educators delete assignments" ON public.assignments
  FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_org_admin(organization_id));

-- drafts and their sources: authors and org admins only. Never learners.
CREATE POLICY "scenarios readable by author or org admin" ON public.scenarios
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "scenarios insert by member" ON public.scenarios
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.is_org_member(organization_id));
CREATE POLICY "scenarios update by author" ON public.scenarios
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "scenarios delete by author" ON public.scenarios
  FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_org_admin(organization_id));

CREATE POLICY "documents by author or org admin" ON public.context_documents
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "documents write by author" ON public.context_documents
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "chunks by author" ON public.document_chunks
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "versions readable" ON public.scenario_versions
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_admin(organization_id) OR public.can_access_version(id));
CREATE POLICY "versions insert by author" ON public.scenario_versions
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "participants readable" ON public.scenario_participants
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_admin(organization_id) OR public.can_access_version(scenario_version_id));
CREATE POLICY "participants insert by author" ON public.scenario_participants
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "sessions readable" ON public.rehearsal_sessions
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "sessions insert by owner" ON public.rehearsal_sessions
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "sessions update by owner" ON public.rehearsal_sessions
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "states by owner" ON public.simulation_states
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "events readable" ON public.simulation_events
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "events insert by owner" ON public.simulation_events
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "events finalize by owner" ON public.simulation_events
  FOR UPDATE TO authenticated USING (owner_id = auth.uid() AND status = 'pending') WITH CHECK (owner_id = auth.uid());

CREATE POLICY "flags readable" ON public.flags
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "flags insert by user" ON public.flags
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "flags update by reviewer" ON public.flags
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_org_admin(organization_id))
  WITH CHECK (user_id = auth.uid() OR public.is_org_admin(organization_id));

CREATE POLICY "reviews readable" ON public.after_action_reviews
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "reviews insert by owner" ON public.after_action_reviews
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "reviews update by owner" ON public.after_action_reviews
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "audit readable by org admin" ON public.audit_events
  FOR SELECT TO authenticated USING (public.is_org_admin(organization_id) OR actor_id = auth.uid());
CREATE POLICY "audit insert by actor" ON public.audit_events
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE POLICY "usage readable by org admin" ON public.model_usage_events
  FOR SELECT TO authenticated USING (public.is_org_admin(organization_id) OR user_id = auth.uid());
CREATE POLICY "usage insert by user" ON public.model_usage_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "foundation versions readable" ON public.foundation_versions
  FOR SELECT TO authenticated USING (true);

-- foundation instruction bodies are authoring material, not learner-visible
CREATE POLICY "foundation readable by non-learners" ON public.foundation_resources
  FOR SELECT TO authenticated USING (true);

-- ---------- updated_at triggers ----------
CREATE TRIGGER t_orgs BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_groups BEFORE UPDATE ON public.courses_or_groups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_assignments BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_org_memberships BEFORE UPDATE ON public.organization_memberships FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();