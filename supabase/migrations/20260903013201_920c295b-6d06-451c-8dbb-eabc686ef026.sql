CREATE TABLE public.session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.rehearsal_sessions(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.simulation_events(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id),
  author_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_feedback_session_idx ON public.session_feedback(session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_feedback TO authenticated;
GRANT ALL ON public.session_feedback TO service_role;

ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_session_instructor(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rehearsal_sessions s
    JOIN public.organization_memberships m
      ON m.organization_id = s.organization_id
    WHERE s.id = _session_id
      AND m.user_id = _user_id
      AND m.status = 'active'
      AND m.role IN ('admin', 'educator')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_session_owner(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rehearsal_sessions s
    WHERE s.id = _session_id AND s.owner_id = _user_id
  );
$$;

CREATE POLICY "Owners and instructors read session feedback"
ON public.session_feedback FOR SELECT TO authenticated
USING (
  public.is_session_owner(session_id, auth.uid())
  OR public.is_session_instructor(session_id, auth.uid())
);

CREATE POLICY "Instructors write session feedback"
ON public.session_feedback FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_session_instructor(session_id, auth.uid())
);

CREATE POLICY "Authors update their session feedback"
ON public.session_feedback FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors delete their session feedback"
ON public.session_feedback FOR DELETE TO authenticated
USING (author_id = auth.uid());

CREATE TRIGGER session_feedback_touch
BEFORE UPDATE ON public.session_feedback
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();