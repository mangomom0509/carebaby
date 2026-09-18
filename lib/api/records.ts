import { supabase } from '../supabase';
import type { RecordEntry, RecordType } from '../types';

export async function listRecordsForDate(childId: string, date: string): Promise<RecordEntry[]> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('child_id', childId)
    .eq('record_date', date)
    .order('time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RecordEntry[];
}

export async function addRecord(input: {
  childId: string;
  date: string;
  time: string;
  type: RecordType;
  amount?: number | null;
  note?: string | null;
  sub?: string | null;
}): Promise<RecordEntry> {
  const { data, error } = await supabase
    .from('records')
    .insert({
      child_id: input.childId,
      record_date: input.date,
      time: input.time,
      type: input.type,
      amount: input.amount ?? null,
      note: input.note ?? null,
      sub: input.sub ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as RecordEntry;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase.from('records').delete().eq('id', id);
  if (error) throw error;
}

export async function listRecordsForMonth(childId: string, year: number, month: number): Promise<RecordEntry[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 1);
  const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-01`;
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('child_id', childId)
    .gte('record_date', start)
    .lt('record_date', endIso);
  if (error) throw error;
  return (data ?? []) as RecordEntry[];
}
