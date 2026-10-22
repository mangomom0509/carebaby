import { supabase } from '../supabase';
import type { PlayLog } from '../types';

export async function listPlayLogsForChild(childId: string): Promise<PlayLog[]> {
  const { data, error } = await supabase.from('play_logs').select('*').eq('child_id', childId).order('played_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PlayLog[];
}

export async function logPlayToday(childId: string, playId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('play_logs')
    .upsert({ child_id: childId, play_id: playId, played_date: date }, { onConflict: 'child_id,play_id,played_date' });
  if (error) throw error;
}

export async function unlogPlayToday(childId: string, playId: string, date: string): Promise<void> {
  const { error } = await supabase.from('play_logs').delete().eq('child_id', childId).eq('play_id', playId).eq('played_date', date);
  if (error) throw error;
}
