import { supabase } from '../supabase';
import type { ScheduleLogEntry, ScheduleTemplateItem } from '../types';

export async function listScheduleTemplate(childId: string): Promise<ScheduleTemplateItem[]> {
  const { data, error } = await supabase
    .from('schedule_template')
    .select('*')
    .eq('child_id', childId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScheduleTemplateItem[];
}

export async function addScheduleTemplateItem(input: {
  childId: string;
  time: string;
  label: string;
}): Promise<ScheduleTemplateItem> {
  const { data: existing, error: existingError } = await supabase
    .from('schedule_template')
    .select('sort_order')
    .eq('child_id', input.childId)
    .order('sort_order', { ascending: false })
    .limit(1);
  if (existingError) throw existingError;
  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('schedule_template')
    .insert({ child_id: input.childId, time: input.time, label: input.label, sort_order: nextOrder })
    .select('*')
    .single();
  if (error) throw error;
  return data as ScheduleTemplateItem;
}

export async function deleteScheduleTemplateItem(id: string): Promise<void> {
  const { error } = await supabase.from('schedule_template').delete().eq('id', id);
  if (error) throw error;
}

export async function listScheduleLogForDate(childId: string, date: string): Promise<ScheduleLogEntry[]> {
  const { data, error } = await supabase.from('schedule_log').select('*').eq('child_id', childId).eq('log_date', date);
  if (error) throw error;
  return (data ?? []) as ScheduleLogEntry[];
}

export async function logScheduleItem(input: {
  childId: string;
  itemId: string;
  date: string;
  startTime: string;
  amount?: number | null;
  level?: string | null;
}): Promise<ScheduleLogEntry> {
  const { data, error } = await supabase
    .from('schedule_log')
    .upsert(
      {
        child_id: input.childId,
        item_id: input.itemId,
        log_date: input.date,
        start_time: input.startTime,
        amount: input.amount ?? null,
        level: input.level ?? null,
      },
      { onConflict: 'item_id,log_date' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as ScheduleLogEntry;
}

export async function unlogScheduleItem(itemId: string, date: string): Promise<void> {
  const { error } = await supabase.from('schedule_log').delete().eq('item_id', itemId).eq('log_date', date);
  if (error) throw error;
}
