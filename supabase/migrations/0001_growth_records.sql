-- Adds growth tracking (height / weight / head circumference over time).
-- Run this once in the Supabase SQL editor against an existing 토닥 project
-- that was already bootstrapped from supabase/schema.sql.

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

alter table growth_records enable row level security;

create policy "growth_records: family members full access" on growth_records
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));
