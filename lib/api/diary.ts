import { supabase } from '../supabase';
import type { DiaryEntry } from '../types';

export async function getDiaryEntry(childId: string, date: string): Promise<DiaryEntry | null> {
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('child_id', childId)
    .eq('entry_date', date)
    .maybeSingle();
  if (error) throw error;
  return data as DiaryEntry | null;
}

export async function saveDiaryEntry(childId: string, date: string, text: string): Promise<DiaryEntry> {
  const { data, error } = await supabase
    .from('diary_entries')
    .upsert(
      { child_id: childId, entry_date: date, text, updated_at: new Date().toISOString() },
      { onConflict: 'child_id,entry_date' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as DiaryEntry;
}
