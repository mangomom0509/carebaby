import { supabase } from '../supabase';
import type { DailyNote } from '../types';

export async function getDailyNote(childId: string, date: string): Promise<DailyNote | null> {
  const { data, error } = await supabase
    .from('daily_notes')
    .select('*')
    .eq('child_id', childId)
    .eq('note_date', date)
    .maybeSingle();
  if (error) throw error;
  return data as DailyNote | null;
}

export async function saveDailyNote(input: {
  childId: string;
  date: string;
  text: string;
  author: string;
  noteTime: string;
}): Promise<DailyNote> {
  const { data, error } = await supabase
    .from('daily_notes')
    .upsert(
      { child_id: input.childId, note_date: input.date, text: input.text, author: input.author, note_time: input.noteTime, ack: false },
      { onConflict: 'child_id,note_date' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as DailyNote;
}

export async function setDailyNoteAck(childId: string, date: string, ack: boolean): Promise<void> {
  const { error } = await supabase.from('daily_notes').update({ ack }).eq('child_id', childId).eq('note_date', date);
  if (error) throw error;
}
