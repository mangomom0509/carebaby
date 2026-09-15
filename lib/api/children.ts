import { supabase } from '../supabase';
import type { Child, Gender } from '../types';

const DEFAULT_SCHEDULE: Array<{ time: string; label: string; sort_order: number }> = [
  { time: '07:00', label: '기상', sort_order: 0 },
  { time: '09:30', label: '간식1', sort_order: 1 },
  { time: '12:30', label: '낮잠', sort_order: 2 },
  { time: '14:30', label: '기상', sort_order: 3 },
  { time: '16:00', label: '간식2', sort_order: 4 },
  { time: '19:30', label: '밤잠', sort_order: 5 },
];

export async function createChild(input: {
  familyId: string;
  name: string;
  birth: string;
  gender: Gender;
}): Promise<Child> {
  const { data: child, error } = await supabase
    .from('children')
    .insert({
      family_id: input.familyId,
      name: input.name,
      birth: input.birth,
      gender: input.gender,
      regular_pattern: true,
    })
    .select('*')
    .single();
  if (error) throw error;

  const { error: schedError } = await supabase.from('schedule_template').insert(
    DEFAULT_SCHEDULE.map((item) => ({
      child_id: (child as Child).id,
      time: item.time,
      label: item.label,
      sort_order: item.sort_order,
    })),
  );
  if (schedError) throw schedError;

  return child as Child;
}
