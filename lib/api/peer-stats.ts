import { supabase } from '../supabase';

export async function submitPeerPlayStats(
  anonId: string,
  band: string,
  isoWeek: string,
  domainCounts: Record<string, number>,
): Promise<void> {
  const { error } = await supabase
    .from('peer_play_stats')
    .upsert(
      { anon_id: anonId, band, iso_week: isoWeek, domain_counts: domainCounts, updated_at: new Date().toISOString() },
      { onConflict: 'anon_id,band,iso_week' },
    );
  if (error) throw error;
}

export interface PeerPlayStatsResult {
  participantCount: number;
  domainCounts: Record<string, number> | null;
}

export async function fetchPeerPlayStats(band: string, isoWeek: string): Promise<PeerPlayStatsResult> {
  const { data, error } = await supabase.rpc('peer_play_stats_for_week', { p_band: band, p_iso_week: isoWeek });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    participantCount: row?.participant_count ?? 0,
    domainCounts: row?.domain_counts ?? null,
  };
}

export async function deleteAllPeerPlayStats(anonId: string): Promise<void> {
  const { error } = await supabase.from('peer_play_stats').delete().eq('anon_id', anonId);
  if (error) throw error;
}
