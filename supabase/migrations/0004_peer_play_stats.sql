-- "또래 친구들은 이번 주에" 익명 통계. 가족/아이와 연결되는 외래키가 없다 —
-- anon_id는 계정과 의도적으로 분리된, 기기에만 저장되는 무작위 ID다.
-- select 정책은 두지 않는다: 원본 행은 누구도 직접 조회할 수 없고,
-- peer_play_stats_for_week() 집계 함수로만 읽는다(5명 미만이면 null 반환).
create table peer_play_stats (
  anon_id text not null,
  band text not null,
  iso_week text not null,
  domain_counts jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (anon_id, band, iso_week)
);
alter table peer_play_stats enable row level security;

create policy "peer_play_stats: authenticated can upsert" on peer_play_stats
  for insert to authenticated with check (true);
create policy "peer_play_stats: authenticated can update" on peer_play_stats
  for update to authenticated using (true) with check (true);
create policy "peer_play_stats: authenticated can delete" on peer_play_stats
  for delete to authenticated using (true);

create or replace function peer_play_stats_for_week(p_band text, p_iso_week text)
returns table(participant_count int, domain_counts jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_sums jsonb;
begin
  select count(distinct anon_id) into v_count
  from peer_play_stats where band = p_band and iso_week = p_iso_week;

  if v_count < 5 then
    return query select v_count, null::jsonb;
    return;
  end if;

  select jsonb_object_agg(domain, total) into v_sums
  from (
    select kv.key as domain, sum((kv.value)::int) as total
    from peer_play_stats p, jsonb_each_text(p.domain_counts) kv
    where p.band = p_band and p.iso_week = p_iso_week
    group by kv.key
  ) t;

  return query select v_count, v_sums;
end;
$$;

grant execute on function peer_play_stats_for_week(text, text) to authenticated;
