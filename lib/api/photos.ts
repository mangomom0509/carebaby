import { decode } from 'base64-arraybuffer';
import { supabase } from '../supabase';
import type { PhotoEntry } from '../types';

const BUCKET = 'photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour, plenty for a screen visit

function storagePathFor(childId: string, date: string): string {
  return `${childId}/${date}.jpg`;
}

export async function listPhotosForMonth(childId: string, year: number, month: number): Promise<PhotoEntry[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 1); // first day of next month
  const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-01`;
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('child_id', childId)
    .gte('photo_date', start)
    .lt('photo_date', endIso);
  if (error) throw error;
  return (data ?? []) as PhotoEntry[];
}

export async function getPhotoForDate(childId: string, date: string): Promise<PhotoEntry | null> {
  const { data, error } = await supabase.from('photos').select('*').eq('child_id', childId).eq('photo_date', date).maybeSingle();
  if (error) throw error;
  return data as PhotoEntry | null;
}

export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) map[entry.path] = entry.signedUrl;
  }
  return map;
}

export async function uploadPhotoForDate(childId: string, date: string, base64: string): Promise<PhotoEntry> {
  const path = storagePathFor(childId, date);
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, decode(base64), {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('photos')
    .upsert({ child_id: childId, photo_date: date, storage_path: path }, { onConflict: 'child_id,photo_date' })
    .select('*')
    .single();
  if (error) throw error;
  return data as PhotoEntry;
}

export async function deletePhotoForDate(childId: string, date: string): Promise<void> {
  const path = storagePathFor(childId, date);
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('photos').delete().eq('child_id', childId).eq('photo_date', date);
  if (error) throw error;
}
