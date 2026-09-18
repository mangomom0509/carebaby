-- Lets a family pick which day's photo represents each month in "이달의 이야기".
-- Run this once in the Supabase SQL editor against an existing 토닥 project
-- that was already bootstrapped from supabase/schema.sql.

create table monthly_cover_photos (
  child_id uuid not null references children(id) on delete cascade,
  year int not null,
  month int not null,
  photo_date date not null,
  created_at timestamptz not null default now(),
  primary key (child_id, year, month)
);

alter table monthly_cover_photos enable row level security;

create policy "monthly_cover_photos: family members full access" on monthly_cover_photos
  for all using (is_family_member(family_id_for_child(child_id)))
  with check (is_family_member(family_id_for_child(child_id)));
