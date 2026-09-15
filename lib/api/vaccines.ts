import { supabase } from '../supabase';
import type { VaccineDose } from '../types';

export async function listDoneVaccines(childId: string): Promise<VaccineDose[]> {
  const { data, error } = await supabase.from('vaccine_doses').select('*').eq('child_id', childId);
  if (error) throw error;
  return (data ?? []) as VaccineDose[];
}

export async function markVaccineDone(childId: string, vaccineId: string, actualDate: string): Promise<VaccineDose> {
  const { data, error } = await supabase
    .from('vaccine_doses')
    .upsert({ child_id: childId, vaccine_id: vaccineId, actual_date: actualDate }, { onConflict: 'child_id,vaccine_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as VaccineDose;
}

export async function unmarkVaccineDone(childId: string, vaccineId: string): Promise<void> {
  const { error } = await supabase.from('vaccine_doses').delete().eq('child_id', childId).eq('vaccine_id', vaccineId);
  if (error) throw error;
}
