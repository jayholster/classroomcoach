CREATE OR REPLACE FUNCTION private.is_session_instructor(_session_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rehearsal_sessions s
    JOIN public.organization_memberships m ON m.organization_id = s.organization_id
    WHERE s.id = _session_id AND m.user_id = _user_id AND m.status = 'active'
      AND m.role IN ('admin', 'educator')
  );
$$;

CREATE OR REPLACE FUNCTION private.is_session_owner(_session_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rehearsal_sessions s WHERE s.id = _session_id AND s.owner_id = _user_id);
$$;

DROP POLICY "Owners and instructors read session feedback" ON public.session_feedback;
DROP POLICY "Instructors write session feedback" ON public.session_feedback;

CREATE POLICY "Owners and instructors read session feedback"
ON public.session_feedback FOR SELECT TO authenticated
USING (private.is_session_owner(session_id, auth.uid()) OR private.is_session_instructor(session_id, auth.uid()));

CREATE POLICY "Instructors write session feedback"
ON public.session_feedback FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND private.is_session_instructor(session_id, auth.uid()));

DROP FUNCTION public.is_session_instructor(uuid, uuid);
DROP FUNCTION public.is_session_owner(uuid, uuid);