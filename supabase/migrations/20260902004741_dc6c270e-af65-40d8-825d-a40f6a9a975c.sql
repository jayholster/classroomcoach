
-- ROLES ---------------------------------------------------------------
create type public.app_role as enum ('admin','educator','learner');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'educator') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- FOUNDATION ----------------------------------------------------------
create table public.foundation_resources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  governs text not null,
  body text not null,
  version text not null default 'Foundation 2026.1',
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.foundation_resources to authenticated;
grant all on public.foundation_resources to service_role;
alter table public.foundation_resources enable row level security;
create policy "read foundation" on public.foundation_resources for select to authenticated using (true);
create policy "admins write foundation" on public.foundation_resources for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.people_profiles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  participant_type text not null,
  grade_label text not null,
  descriptor text not null default '',
  background text not null default '',
  ses text not null default '',
  tendencies text[] not null default '{}',
  close_with text[] not null default '{}',
  tension_with text[] not null default '{}',
  interests text[] not null default '{}',
  knows text[] not null default '{}',
  hidden_from_teacher text[] not null default '{}',
  source_reference text not null default 'People Library',
  updated_at timestamptz not null default now()
);
grant select on public.people_profiles to authenticated;
grant all on public.people_profiles to service_role;
alter table public.people_profiles enable row level security;
create policy "read people" on public.people_profiles for select to authenticated using (true);
create policy "admins write people" on public.people_profiles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- MODEL CONFIG --------------------------------------------------------
create table public.model_configurations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider_type text not null default 'lovable_ai',
  model text not null,
  endpoint text,
  temperature numeric,
  max_output int,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.model_configurations to authenticated;
grant all on public.model_configurations to service_role;
alter table public.model_configurations enable row level security;
create policy "read model configs" on public.model_configurations for select to authenticated using (true);
create policy "admins write model configs" on public.model_configurations for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger t_model_cfg before update on public.model_configurations for each row execute function public.touch_updated_at();

insert into public.model_configurations (name, provider_type, model, active)
values ('Default (Lovable AI)', 'lovable_ai', 'openai/gpt-5.6-sol', true);

-- SCENARIOS -----------------------------------------------------------
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled simulation',
  subtitle text not null default '',
  practice_purpose text not null default '',
  practicing_role text not null default '',
  setting_label text not null default '',
  specifics text not null default '',
  status text not null default 'Draft',
  draft_spec jsonb,
  generation_error text,
  model_provider text,
  model_identifier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.scenarios to authenticated;
grant all on public.scenarios to service_role;
alter table public.scenarios enable row level security;
create policy "own scenarios" on public.scenarios for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create trigger t_scenarios before update on public.scenarios for each row execute function public.touch_updated_at();

create table public.context_documents (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  mime_type text not null default '',
  byte_size int not null default 0,
  storage_path text,
  status text not null default 'Uploading',
  error_message text,
  extracted_chars int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.context_documents to authenticated;
grant all on public.context_documents to service_role;
alter table public.context_documents enable row level security;
create policy "own documents" on public.context_documents for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create trigger t_docs before update on public.context_documents for each row execute function public.touch_updated_at();

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.context_documents(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  chunk_index int not null,
  source_name text not null,
  content text not null,
  char_count int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.document_chunks to authenticated;
grant all on public.document_chunks to service_role;
alter table public.document_chunks enable row level security;
create policy "own chunks" on public.document_chunks for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create index idx_chunks_scenario on public.document_chunks(scenario_id);

create table public.scenario_versions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version_label text not null,
  spec jsonb not null,
  foundation_version text not null,
  context_document_ids uuid[] not null default '{}',
  created_by uuid,
  creator_label text,
  model_provider text,
  model_identifier text,
  model_config_id uuid references public.model_configurations(id),
  created_at timestamptz not null default now(),
  unique (scenario_id, version_label)
);
grant select, insert on public.scenario_versions to authenticated;
grant all on public.scenario_versions to service_role;
alter table public.scenario_versions enable row level security;
create policy "own versions read" on public.scenario_versions for select to authenticated using (auth.uid() = owner_id);
create policy "own versions insert" on public.scenario_versions for insert to authenticated with check (auth.uid() = owner_id);

create table public.scenario_participants (
  id uuid primary key default gen_random_uuid(),
  scenario_version_id uuid not null references public.scenario_versions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  participant_id text not null,
  profile_source_id text,
  name text not null,
  role text not null default '',
  scenario_relevant_background text not null default '',
  current_goal text not null default '',
  current_concern text not null default '',
  known_information text[] not null default '{}',
  latent_information text[] not null default '{}',
  provenance jsonb not null default '[]'
);
grant select, insert on public.scenario_participants to authenticated;
grant all on public.scenario_participants to service_role;
alter table public.scenario_participants enable row level security;
create policy "own participants read" on public.scenario_participants for select to authenticated using (auth.uid() = owner_id);
create policy "own participants insert" on public.scenario_participants for insert to authenticated with check (auth.uid() = owner_id);

-- REHEARSAL -----------------------------------------------------------
create table public.rehearsal_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  scenario_version_id uuid not null references public.scenario_versions(id) on delete cascade,
  scenario_title text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  review jsonb
);
grant select, insert, update, delete on public.rehearsal_sessions to authenticated;
grant all on public.rehearsal_sessions to service_role;
alter table public.rehearsal_sessions enable row level security;
create policy "own sessions" on public.rehearsal_sessions for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.simulation_states (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.rehearsal_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.simulation_states to authenticated;
grant all on public.simulation_states to service_role;
alter table public.simulation_states enable row level security;
create policy "own states" on public.simulation_states for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.simulation_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.rehearsal_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  sequence int not null,
  scenario_id uuid not null,
  scenario_version_id uuid not null,
  foundation_version text not null default '',
  model_provider text,
  model_identifier text,
  model_config_id uuid,
  prior_state jsonb,
  user_action text,
  visible_response jsonb,
  state_update jsonb,
  resulting_state jsonb,
  kind text not null default 'turn',
  created_at timestamptz not null default now()
);
grant select, insert on public.simulation_events to authenticated;
grant all on public.simulation_events to service_role;
alter table public.simulation_events enable row level security;
create policy "own events read" on public.simulation_events for select to authenticated using (auth.uid() = owner_id);
create policy "own events insert" on public.simulation_events for insert to authenticated with check (auth.uid() = owner_id);
create index idx_events_session on public.simulation_events(session_id, sequence);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.simulation_events(id) on delete cascade,
  session_id uuid not null references public.rehearsal_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  note text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.flags to authenticated;
grant all on public.flags to service_role;
alter table public.flags enable row level security;
create policy "own flags" on public.flags for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.assurance_runs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.simulation_events(id) on delete cascade,
  run_by uuid not null references auth.users(id) on delete cascade,
  model_provider text,
  model_identifier text,
  visible_response jsonb,
  state_update jsonb,
  checks jsonb not null default '[]',
  error_message text,
  created_at timestamptz not null default now()
);
grant select, insert on public.assurance_runs to authenticated;
grant all on public.assurance_runs to service_role;
alter table public.assurance_runs enable row level security;
create policy "admins read runs" on public.assurance_runs for select to authenticated using (public.has_role(auth.uid(),'admin') or auth.uid() = run_by);
create policy "admins insert runs" on public.assurance_runs for insert to authenticated with check (auth.uid() = run_by);

-- PLACEHOLDER GROUPING ------------------------------------------------
create table public.courses_or_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.courses_or_groups to authenticated;
grant all on public.courses_or_groups to service_role;
alter table public.courses_or_groups enable row level security;
create policy "own groups" on public.courses_or_groups for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.courses_or_groups(id) on delete cascade,
  scenario_version_id uuid references public.scenario_versions(id) on delete cascade,
  title text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.assignments to authenticated;
grant all on public.assignments to service_role;
alter table public.assignments enable row level security;
create policy "own assignments" on public.assignments for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
