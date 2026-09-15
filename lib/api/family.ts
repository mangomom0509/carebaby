import { supabase } from '../supabase';

export async function createFamily(name: string, displayName?: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_family_with_owner', {
    p_name: name || '우리 가족',
    p_display_name: displayName ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function createInviteCode(familyId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_family_invite', { p_family_id: familyId });
  if (error) throw error;
  return data as string;
}

export type JoinFamilyErrorReason = 'invalid_code' | 'code_expired' | 'unknown';

export class JoinFamilyError extends Error {
  reason: JoinFamilyErrorReason;
  constructor(reason: JoinFamilyErrorReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

export async function joinFamilyByCode(code: string, displayName?: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_family_by_code', {
    p_code: code.trim().toUpperCase(),
    p_display_name: displayName ?? null,
  });
  if (error) {
    const msg = error.message || '';
    if (msg.includes('invalid_code')) throw new JoinFamilyError('invalid_code', '유효하지 않은 코드예요.');
    if (msg.includes('code_expired')) throw new JoinFamilyError('code_expired', '만료된 코드예요.');
    throw new JoinFamilyError('unknown', msg);
  }
  return data as string;
}
