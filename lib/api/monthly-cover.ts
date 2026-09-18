import { supabase } from '../supabase';

export async function getCoverPhotoDate(childId: string, year: number, month: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('monthly_cover_photos')
    .select('photo_date')
    .eq('child_id', childId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();
  if (error) throw error;
  return data?.photo_date ?? null;
}

export async function setCoverPhotoDate(childId: string, year: number, month: number, photoDate: string): Promise<void> {
  const { error } = await supabase
    .from('monthly_cover_photos')
    .upsert({ child_id: childId, year, month, photo_date: photoDate }, { onConflict: 'child_id,year,month' });
  if (error) throw error;
}
