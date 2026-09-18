import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import type { Child, Family, FamilyMember } from './types';

const ACTIVE_CHILD_KEY = 'todak-active-child-id';

interface AuthState {
  loading: boolean;
  session: Session | null;
  family: Family | null;
  membership: FamilyMember | null;
  children: Child[];
  child: Child | null;
  setActiveChildId: (id: string) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [membership, setMembership] = useState<FamilyMember | null>(null);
  const [childList, setChildList] = useState<Child[]>([]);
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);
  const activeChildIdRef = useRef<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_CHILD_KEY).then((saved) => {
      if (saved) {
        activeChildIdRef.current = saved;
        setActiveChildIdState(saved);
      }
    });
  }, []);

  const setActiveChildId = useCallback((id: string) => {
    activeChildIdRef.current = id;
    setActiveChildIdState(id);
    AsyncStorage.setItem(ACTIVE_CHILD_KEY, id);
  }, []);

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
      setChildList([]);
      return;
    }
    setMembership(memberRow as FamilyMember);

    const { data: familyRow } = await supabase
      .from('families')
      .select('*')
      .eq('id', memberRow.family_id)
      .maybeSingle();
    setFamily((familyRow as Family) ?? null);

    const { data: childRows } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', memberRow.family_id)
      .order('created_at', { ascending: true });
    const list = (childRows as Child[]) ?? [];
    setChildList(list);

    const current = activeChildIdRef.current;
    if (list.length > 0 && !list.some((c) => c.id === current)) {
      setActiveChildId(list[0].id);
    }
  }, [setActiveChildId]);

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
        setChildList([]);
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

  const activeChild = childList.find((c) => c.id === activeChildId) ?? childList[0] ?? null;

  const value = useMemo(
    () => ({
      loading,
      session,
      family,
      membership,
      children: childList,
      child: activeChild,
      setActiveChildId,
      refresh,
      signOut,
    }),
    [loading, session, family, membership, childList, activeChild, setActiveChildId, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{reactChildren}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
