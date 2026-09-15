import { supabase } from '../supabase';
import type { DevCheck } from '../types';

export async function listDoneDevChecks(childId: string): Promise<DevCheck[]> {
  const { data, error } = await supabase.from('dev_checks').select('*').eq('child_id', childId);
  if (error) throw error;
  return (data ?? []) as DevCheck[];
}

export async function markDevCheckDone(childId: string, milestoneId: string): Promise<DevCheck> {
  const { data, error } = await supabase
    .from('dev_checks')
    .upsert({ child_id: childId, milestone_id: milestoneId }, { onConflict: 'child_id,milestone_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as DevCheck;
}

export async function unmarkDevCheckDone(childId: string, milestoneId: string): Promise<void> {
  const { error } = await supabase.from('dev_checks').delete().eq('child_id', childId).eq('milestone_id', milestoneId);
  if (error) throw error;
}
