-- ============ research projects ============
CREATE TABLE public.research_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  collection_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_projects TO authenticated;
GRANT ALL ON public.research_projects TO service_role;
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('organization','project','group','scenario')),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.courses_or_groups(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.scenarios(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_research_scopes_user ON public.research_scopes(user_id);
CREATE INDEX idx_research_scopes_project ON public.research_scopes(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_scopes TO authenticated;
GRANT ALL ON public.research_scopes TO service_role;
ALTER TABLE public.research_scopes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudonym text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id),
  UNIQUE (project_id, pseudonym)
);
GRANT SELECT, INSERT ON public.research_participants TO authenticated;
GRANT ALL ON public.research_participants TO service_role;
ALTER TABLE public.research_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_datasets TO authenticated;
GRANT ALL ON public.research_datasets TO service_role;
ALTER TABLE public.research_datasets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  dataset_id uuid REFERENCES public.research_datasets(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  field_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  version_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.research_snapshots TO authenticated;
GRANT ALL ON public.research_snapshots TO service_role;
ALTER TABLE public.research_snapshots ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.rehearsal_sessions(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.simulation_events(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_annotations TO authenticated;
GRANT ALL ON public.research_annotations TO service_role;
ALTER TABLE public.research_annotations ENABLE ROW LEVEL SECURITY;

-- ============ helper functions ============
CREATE OR REPLACE FUNCTION public.is_research_member(_project uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.research_scopes rs WHERE rs.project_id = _project AND rs.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.research_project_org(_project uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.research_projects WHERE id = _project
$$;

CREATE OR REPLACE FUNCTION public.research_can_read_scenario(_scenario uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.scenarios s
    JOIN public.research_scopes rs ON rs.user_id = auth.uid()
    LEFT JOIN public.research_projects p ON p.id = rs.project_id
    WHERE s.id = _scenario
      AND (
        (rs.scope_type = 'scenario' AND rs.scenario_id = s.id)
        OR (rs.scope_type = 'organization' AND rs.organization_id = s.organization_id)
        OR (rs.scope_type = 'project' AND p.organization_id = s.organization_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.research_can_read_session(_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rehearsal_sessions s
    LEFT JOIN public.assignments a ON a.id = s.assignment_id
    JOIN public.research_scopes rs ON rs.user_id = auth.uid()
    LEFT JOIN public.research_projects p ON p.id = rs.project_id
    WHERE s.id = _session
      AND (
        (rs.scope_type = 'organization' AND rs.organization_id = s.organization_id)
        OR (rs.scope_type = 'project' AND p.organization_id = s.organization_id)
        OR (rs.scope_type = 'group' AND rs.group_id = a.group_id)
        OR (rs.scope_type = 'scenario' AND rs.scenario_id = s.scenario_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.research_can_read_org(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.research_scopes rs
    LEFT JOIN public.research_projects p ON p.id = rs.project_id
    WHERE rs.user_id = auth.uid()
      AND (rs.organization_id = _org OR p.organization_id = _org)
  )
$$;

-- ============ policies on new tables ============
CREATE POLICY "research projects readable by members and org admins"
ON public.research_projects FOR SELECT TO authenticated
USING (public.is_research_member(id) OR public.is_org_admin(organization_id));

CREATE POLICY "org admins create research projects"
ON public.research_projects FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin(organization_id) AND created_by = auth.uid());

CREATE POLICY "org admins and creators update research projects"
ON public.research_projects FOR UPDATE TO authenticated
USING (public.is_org_admin(organization_id) OR created_by = auth.uid())
WITH CHECK (public.is_org_admin(organization_id) OR created_by = auth.uid());

CREATE POLICY "scopes visible to holder and project admins"
ON public.research_scopes FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_org_admin(public.research_project_org(project_id)));

CREATE POLICY "project admins grant scopes"
ON public.research_scopes FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin(public.research_project_org(project_id)));

CREATE POLICY "project admins revoke scopes"
ON public.research_scopes FOR DELETE TO authenticated
USING (public.is_org_admin(public.research_project_org(project_id)));

CREATE POLICY "participants visible to research members"
ON public.research_participants FOR SELECT TO authenticated
USING (public.is_research_member(project_id) OR public.is_org_admin(public.research_project_org(project_id)));

CREATE POLICY "research members mint pseudonyms"
ON public.research_participants FOR INSERT TO authenticated
WITH CHECK (public.is_research_member(project_id) OR public.is_org_admin(public.research_project_org(project_id)));

CREATE POLICY "datasets visible to research members"
ON public.research_datasets FOR SELECT TO authenticated
USING (public.is_research_member(project_id));

CREATE POLICY "research members create datasets"
ON public.research_datasets FOR INSERT TO authenticated
WITH CHECK (public.is_research_member(project_id) AND created_by = auth.uid());

CREATE POLICY "dataset owners update"
ON public.research_datasets FOR UPDATE TO authenticated
USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "dataset owners delete"
ON public.research_datasets FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "snapshots visible to research members"
ON public.research_snapshots FOR SELECT TO authenticated
USING (public.is_research_member(project_id));

CREATE POLICY "research members create snapshots"
ON public.research_snapshots FOR INSERT TO authenticated
WITH CHECK (public.is_research_member(project_id) AND created_by = auth.uid());

CREATE POLICY "annotations visible to research members"
ON public.research_annotations FOR SELECT TO authenticated
USING (public.is_research_member(project_id));

CREATE POLICY "research members annotate in scope"
ON public.research_annotations FOR INSERT TO authenticated
WITH CHECK (public.is_research_member(project_id) AND author_id = auth.uid() AND public.research_can_read_session(session_id));

CREATE POLICY "authors update annotations"
ON public.research_annotations FOR UPDATE TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY "authors delete annotations"
ON public.research_annotations FOR DELETE TO authenticated
USING (author_id = auth.uid());

CREATE TRIGGER t_research_projects BEFORE UPDATE ON public.research_projects
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_research_datasets BEFORE UPDATE ON public.research_datasets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_research_annotations BEFORE UPDATE ON public.research_annotations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ scoped read access to study data ============
CREATE POLICY "researchers read sessions in scope"
ON public.rehearsal_sessions FOR SELECT TO authenticated
USING (public.research_can_read_session(id));

CREATE POLICY "researchers read events in scope"
ON public.simulation_events FOR SELECT TO authenticated
USING (public.research_can_read_session(session_id));

CREATE POLICY "researchers read states in scope"
ON public.simulation_states FOR SELECT TO authenticated
USING (public.research_can_read_session(session_id));

CREATE POLICY "researchers read flags in scope"
ON public.flags FOR SELECT TO authenticated
USING (public.research_can_read_session(session_id));

CREATE POLICY "researchers read reviews in scope"
ON public.after_action_reviews FOR SELECT TO authenticated
USING (public.research_can_read_session(session_id));

CREATE POLICY "researchers read assurance runs in scope"
ON public.assurance_runs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.simulation_events e WHERE e.id = event_id AND public.research_can_read_session(e.session_id)));

CREATE POLICY "researchers read scenario versions in scope"
ON public.scenario_versions FOR SELECT TO authenticated
USING (public.research_can_read_scenario(scenario_id));

CREATE POLICY "researchers read scenarios in scope"
ON public.scenarios FOR SELECT TO authenticated
USING (public.research_can_read_scenario(id));

CREATE POLICY "researchers read usage in scope"
ON public.model_usage_events FOR SELECT TO authenticated
USING (session_id IS NOT NULL AND public.research_can_read_session(session_id));