import { supabase } from '../supabase';
import type { CheckupDone } from '../types';

export async function listDoneCheckups(childId: string): Promise<CheckupDone[]> {
  const { data, error } = await supabase.from('checkups_done').select('*').eq('child_id', childId);
  if (error) throw error;
  return (data ?? []) as CheckupDone[];
}

export async function markCheckupDone(childId: string, checkupId: string, doneAt: string): Promise<CheckupDone> {
  const { data, error } = await supabase
    .from('checkups_done')
    .upsert({ child_id: childId, checkup_id: checkupId, done_at: doneAt }, { onConflict: 'child_id,checkup_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as CheckupDone;
}

export async function unmarkCheckupDone(childId: string, checkupId: string): Promise<void> {
  const { error } = await supabase.from('checkups_done').delete().eq('child_id', childId).eq('checkup_id', checkupId);
  if (error) throw error;
}
