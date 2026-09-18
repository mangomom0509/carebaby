-- 토닥 (Todak) database schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
-- Requires: Supabase Auth enabled (auth.users exists by default).

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Families & membership
-- ---------------------------------------------------------------------------

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리 가족',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table family_members (
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- Short-lived invite codes. A code lets anyone who has it join the family once,
-- until it expires. Codes are looked up by primary key so keep them short & unique.
create table family_invites (
  code text primary key,
  family_id uuid not null references families(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- ---------------------------------------------------------------------------
-- Child profile (a family can have more than one child; the app currently
-- drives UI for a single "active" child, but the schema doesn't assume that).
-- ---------------------------------------------------------------------------

create table children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  birth date not null,
  gender text not null check (gender in ('여아', '남아')),
  photo_path text, -- storage object path in the "photos" bucket, or null
  regular_pattern boolean not null default true,
  created_at timestamptz not null default now()
);

-- Completed vaccine doses. Scheduled (upcoming) doses are computed client-side
-- from a static vaccine reference table + birth date, so only completions are stored.
create table vaccine_doses (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  vaccine_id text not null, -- matches the client-side VACCINES reference id, e.g. 'hepb-1'
  actual_date date not null,
  created_at timestamptz not null default now(),
  unique (child_id, vaccine_id)
);

create table checkups_done (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  checkup_id text not null,
  done_at date not null default current_date,
  unique (child_id, checkup_id)
);

create table dev_checks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  milestone_id text not null, -- matches the client-side DEV_MILESTONES id
  done_at timestamptz not null default now(),
  unique (child_id, milestone_id)
);

create table todos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  label text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Daily fixed schedule template (regular-pattern mode).
create table schedule_template (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  time text not null, -- 'HH:MM'
  end_time text,
  label text not null,
  default_amount int,
  sort_order int not null default 0
);

-- Actual logged time/amount against a schedule_template item, per date.
create table schedule_log (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  item_id uuid not null references schedule_template(id) on delete cascade,
  log_date date not null,
  start_time text not null,
  end_time text,
  amount int,
  level text,
  unique (item_id, log_date)
);

-- Timeline entries (feed/water/meal/kidmeal/snack/sleep/diaper/shot/temp/routine).
create table records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  record_date date not null,
  time text not null, -- 'HH:MM'
  type text not null,
  amount numeric,
  level text,
  note text,
  sub text, -- diaper 소변/대변
  end_time text, -- sleep records
  source_schedule_item uuid references schedule_template(id) on delete set null,
  created_at timestamptz not null default now()
);

create table diary_entries (
  child_id uuid not null references children(id) on delete cascade,
  entry_date date not null,
  text text not null default '',
  updated_at timestamptz not null default now(),
  primary key (child_id, entry_date)
);

create table daily_notes (
  child_id uuid not null references children(id) on delete cascade,
  note_date date not null,
  text text not null,
  author text not null,
  note_time text not null,
  ack boolean not null default false,
  primary key (child_id, note_date)
);

create table photos (
  child_id uuid not null references children(id) on delete cascade,
  photo_date date not null,
  storage_path text not null, -- object path in the "photos" bucket
  created_at timestamptz not null default now(),
  primary key (child_id, photo_date)
);

-- Growth measurements over time (height/weight/head circumference). Percentile
-- comparison against WHO Child Growth Standards happens client-side.
create table growth_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  measured_date date not null,
  height_cm numeric(5,1),
  weight_kg numeric(5,2),
  head_circumference_cm numeric(5,1),
  created_at timestamptz not null default now(),
  unique (child_id, measured_date)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table families enable row level security;
alter table family_members enable row level security;
alter table family_invites enable row level security;
alter table children enable row level security;
alter table vaccine_doses enable row level security;
alter table checkups_done enable row level security;
alter table dev_checks enable row level security;
alter table todos enable row level security;
alter table schedule_template enable row level security;
alter table schedule_log enable row level security;
alter table records enable row level security;
alter table diary_entries enable row level security;
alter table daily_notes enable row level security;
alter table photos enable row level security;
alter table growth_records enable row level security;

create or replace function is_family_member(p_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from family_members
    where family_id = p_family_id and user_id = auth.uid()
  );
$$;

create or replace function family_id_for_child(p_child_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select family_id from children where id = p_child_id;
$$;

-- families: members can read their own family; anyone authenticated can create one.
create policy "families: members can read" on families
  for select using (is_family_member(id));
create policy "families: authenticated users can create" on families
  for insert with check (auth.uid() = created_by);
create policy "families: owner can update" on families
  for update using (is_family_member(id));

-- family_members: members can see their family roster; a member can leave (delete self).
create policy "family_members: members can read roster" on family_members
  for select using (is_family_member(family_id));
create policy "family_members: user can remove self" on family_members
  for delete using (user_id = auth.uid());
-- Note: inserting into family_members happens only via the join_family_by_code()
-- and create_family_with_owner() SECURITY DEFINER functions below, not directly.

-- family_invites: members can create/view codes for their own family.
create policy "family_invites: members can read own family's codes" on family_invites
  for select using (is_family_member(family_id));
create policy "family_invites: members can create codes" on family_invites
  for insert with check (is_family_member(family_id) and created_by = auth.uid());
create policy "family_invites: members can delete own family's codes" on family_invites
  for delete using (is_family_member(family_id));

-- children and every child-scoped table: any family member has full access.
create policy "children: family members full access" on children
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "vaccine_doses: family members full access" on vaccine_doses
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));

create policy "checkups_done: family members full access" on checkups_done
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));

create policy "dev_checks: family members full access" on dev_checks
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));

create policy "todos: family members full access" on todos
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "schedule_template: family members full access" on schedule_template
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));

create policy "schedule_log: family members full access" on schedule_log
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));

create policy "records: family members full access" on records
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));

create policy "diary_entries: family members full access" on diary_entries
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));

create policy "daily_notes: family members full access" on daily_notes
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));

create policy "photos: family members full access" on photos
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));

create policy "growth_records: family members full access" on growth_records
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));

-- ---------------------------------------------------------------------------
-- Family creation & invite-code join (SECURITY DEFINER: bypass RLS safely,
-- because a brand-new member can't yet satisfy is_family_member()).
-- ---------------------------------------------------------------------------

create or replace function create_family_with_owner(p_name text default '우리 가족', p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  insert into families (name, created_by) values (p_name, auth.uid()) returning id into v_family_id;
  insert into family_members (family_id, user_id, role, display_name)
    values (v_family_id, auth.uid(), 'owner', p_display_name);
  return v_family_id;
end;
$$;

-- Generates a 6-character uppercase alphanumeric code (excludes ambiguous chars).
create or replace function generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function create_family_invite(p_family_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempts int := 0;
begin
  if not is_family_member(p_family_id) then
    raise exception 'not a member of this family';
  end if;
  loop
    v_code := generate_invite_code();
    begin
      insert into family_invites (code, family_id, created_by) values (v_code, p_family_id, auth.uid());
      return v_code;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts > 10 then
        raise exception 'could not generate a unique invite code';
      end if;
    end;
  end loop;
end;
$$;

create or replace function join_family_by_code(p_code text, p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite family_invites;
  v_family_id uuid;
begin
  select * into v_invite from family_invites where code = upper(trim(p_code));
  if not found then
    raise exception 'invalid_code';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'code_expired';
  end if;
  v_family_id := v_invite.family_id;
  insert into family_members (family_id, user_id, role, display_name)
    values (v_family_id, auth.uid(), 'member', p_display_name)
    on conflict (family_id, user_id) do nothing;
  return v_family_id;
end;
$$;

grant execute on function create_family_with_owner(text, text) to authenticated;
grant execute on function create_family_invite(uuid) to authenticated;
grant execute on function join_family_by_code(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for photos (private; access goes through the RLS-checked
-- `photos` table, so the bucket itself just needs authenticated read/write).
-- Run once; Supabase also lets you create this from the Storage UI instead.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "photos bucket: authenticated read" on storage.objects
  for select using (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "photos bucket: authenticated write" on storage.objects
  for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "photos bucket: authenticated update" on storage.objects
  for update using (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "photos bucket: authenticated delete" on storage.objects
  for delete using (bucket_id = 'photos' and auth.role() = 'authenticated');
