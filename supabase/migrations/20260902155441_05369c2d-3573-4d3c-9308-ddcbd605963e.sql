drop function if exists public.commit_simulation_event(uuid, integer, text, text, jsonb, jsonb, jsonb, text, text, text, uuid, jsonb, text);
create or replace function public.commit_simulation_event(
  _session_id uuid,
  _actor_id uuid,
  _expected_sequence integer,
  _kind text,
  _user_action text,
  _visible_response jsonb,
  _state_update jsonb,
  _resulting_state jsonb,
  _foundation_version text,
  _model_provider text,
  _model_identifier text,
  _model_config_id uuid,
  _prior_state jsonb,
  _app_release text default null
)
returns public.simulation_events
language plpgsql
security definer
set search_path = public
as $$
declare
  _session public.rehearsal_sessions%rowtype;
  _next integer;
  _event public.simulation_events%rowtype;
begin
  if _kind not in ('turn', 'scene_change') then
    raise exception 'Unsupported simulation event.' using errcode = '22023';
  end if;
  select * into _session from public.rehearsal_sessions where id = _session_id for update;
  if not found then raise exception 'Rehearsal not found.' using errcode = 'P0002'; end if;
  if _session.owner_id <> _actor_id then raise exception 'You do not have permission to add to this rehearsal.' using errcode = '42501'; end if;
  if _session.ended_at is not null then raise exception 'This rehearsal has already ended.' using errcode = 'P0001'; end if;
  select coalesce(max(sequence), 0) + 1 into _next from public.simulation_events where session_id = _session_id;
  if _expected_sequence is not null and _expected_sequence <> _next then
    raise exception 'Another response was recorded first. Reload the rehearsal to see the latest turn.' using errcode = 'P0001';
  end if;
  insert into public.simulation_events (
    session_id, owner_id, sequence, kind, scenario_id, scenario_version_id,
    foundation_version, model_provider, model_identifier, model_config_id,
    prior_state, user_action, visible_response, state_update, resulting_state,
    organization_id, app_release
  ) values (
    _session_id, _session.owner_id, _next, _kind, _session.scenario_id, _session.scenario_version_id,
    _foundation_version, _model_provider, _model_identifier, _model_config_id,
    _prior_state, _user_action, _visible_response, _state_update, _resulting_state,
    _session.organization_id, _app_release
  ) returning * into _event;
  insert into public.simulation_states (session_id, owner_id, state, organization_id)
  values (_session_id, _session.owner_id, _resulting_state, _session.organization_id)
  on conflict (session_id) do update set state = excluded.state, updated_at = now();
  return _event;
end;
$$;
revoke all on function public.commit_simulation_event(uuid, uuid, integer, text, text, jsonb, jsonb, jsonb, text, text, text, uuid, jsonb, text) from public, anon, authenticated;