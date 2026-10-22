-- Daily "오늘 해봤어요" play-idea logs. Unlike the other *_done tables, a play
-- can be logged on multiple different days (repeatable), not just once ever.
-- Run this once in the Supabase SQL editor against an existing 토닥 project
-- that was already bootstrapped from supabase/schema.sql.

create table play_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  play_id text not null, -- matches the id field in lib/data/play-ideas.json
  played_date date not null,
  created_at timestamptz not null default now(),
  unique (child_id, play_id, played_date)
);

alter table play_logs enable row level security;

create policy "play_logs: family members full access" on play_logs
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));
