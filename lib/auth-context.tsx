import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import type { Child, Family, FamilyMember } from './types';

interface AuthState {
  loading: boolean;
  session: Session | null;
  family: Family | null;
  membership: FamilyMember | null;
  child: Child | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [membership, setMembership] = useState<FamilyMember | null>(null);
  const [child, setChild] = useState<Child | null>(null);

  const loadFamilyAndChild = useCallback(async (userId: string) => {
    const { data: memberRow } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!memberRow) {
      setMembership(null);
      setFamily(null);
      setChild(null);
      return;
    }
    setMembership(memberRow as FamilyMember);

    const { data: familyRow } = await supabase
      .from('families')
      .select('*')
      .eq('id', memberRow.family_id)
      .maybeSingle();
    setFamily((familyRow as Family) ?? null);

    const { data: childRow } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', memberRow.family_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    setChild((childRow as Child) ?? null);
  }, []);

  const refresh = useCallback(async () => {
    if (!session?.user) return;
    await loadFamilyAndChild(session.user.id);
  }, [session, loadFamilyAndChild]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadFamilyAndChild(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user) {
        await loadFamilyAndChild(newSession.user.id);
      } else {
        setFamily(null);
        setMembership(null);
        setChild(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadFamilyAndChild]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ loading, session, family, membership, child, refresh, signOut }),
    [loading, session, family, membership, child, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
