import { supabase } from '../supabase';
import type { GrowthRecord } from '../types';

export async function listGrowthRecords(childId: string): Promise<GrowthRecord[]> {
  const { data, error } = await supabase
    .from('growth_records')
    .select('*')
    .eq('child_id', childId)
    .order('measured_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as GrowthRecord[];
}

export async function saveGrowthRecord(input: {
  childId: string;
  date: string;
  heightCm?: number | null;
  weightKg?: number | null;
  headCircumferenceCm?: number | null;
}): Promise<GrowthRecord> {
  const { data, error } = await supabase
    .from('growth_records')
    .upsert(
      {
        child_id: input.childId,
        measured_date: input.date,
        height_cm: input.heightCm ?? null,
        weight_kg: input.weightKg ?? null,
        head_circumference_cm: input.headCircumferenceCm ?? null,
      },
      { onConflict: 'child_id,measured_date' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as GrowthRecord;
}

export async function deleteGrowthRecord(id: string): Promise<void> {
  const { error } = await supabase.from('growth_records').delete().eq('id', id);
  if (error) throw error;
}
