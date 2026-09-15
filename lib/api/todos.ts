import { supabase } from '../supabase';
import type { Todo } from '../types';

export async function listTodos(familyId: string): Promise<Todo[]> {
  const { data, error } = await supabase.from('todos').select('*').eq('family_id', familyId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Todo[];
}

export async function addTodo(familyId: string, label: string): Promise<Todo> {
  const { data, error } = await supabase.from('todos').insert({ family_id: familyId, label }).select('*').single();
  if (error) throw error;
  return data as Todo;
}

export async function setTodoDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('todos').update({ done }).eq('id', id);
  if (error) throw error;
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) throw error;
}
