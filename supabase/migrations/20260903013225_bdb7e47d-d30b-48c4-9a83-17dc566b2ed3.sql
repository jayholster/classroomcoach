REVOKE ALL ON FUNCTION public.is_session_instructor(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_session_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_session_instructor(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_session_owner(uuid, uuid) TO authenticated, service_role;