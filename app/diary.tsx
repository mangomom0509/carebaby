import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import { getDiaryEntry, saveDiaryEntry } from '../lib/api/diary';
import { toISO, todayStart } from '../lib/dates';
import { colors, radius, spacing } from '../lib/theme';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_NAMES[d.getDay()]})`;
}

export default function DiaryScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(() => todayStart());
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dateIso = useMemo(() => toISO(date), [date]);
  const isToday = dateIso === toISO(todayStart());

  const load = useCallback(async () => {
    if (!child) return;
    setLoading(true);
    try {
      const entry = await getDiaryEntry(child.id, dateIso);
      setText(entry?.text ?? '');
      setSavedAt(entry?.updated_at ?? null);
    } finally {
      setLoading(false);
    }
  }, [child, dateIso]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!child) return;
    const channel = supabase
      .channel(`diary-${child.id}-${dateIso}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'diary_entries', filter: `child_id=eq.${child.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [child, dateIso, load]);

  const save = async () => {
    if (!child) return;
    setSaving(true);
    try {
      const entry = await saveDiaryEntry(child.id, dateIso, text);
      setSavedAt(entry.updated_at);
    } finally {
      setSaving(false);
    }
  };

  if (!child) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>육아일기</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => setDate((d) => addDays(d, -1))} hitSlop={10}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {formatDate(date)}
          {isToday ? ' · 오늘' : ''}
        </Text>
        <TouchableOpacity onPress={() => setDate((d) => addDays(d, 1))} disabled={isToday} hitSlop={10}>
          <Text style={[styles.navArrow, isToday && styles.navArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <>
          <TextInput
            style={styles.textArea}
            value={text}
            onChangeText={setText}
            placeholder="오늘 하루는 어땠나요?"
            placeholderTextColor={colors.inkFaint}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.footer}>
            {savedAt ? <Text style={styles.savedHint}>마지막 저장: {new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text> : <View />}
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>저장하기</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  back: { fontSize: 14, color: colors.inkSoft, fontWeight: '600', width: 40 },
  title: { fontSize: 17, fontWeight: '800', color: colors.ink },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.md },
  navArrow: { fontSize: 22, color: colors.inkSoft, fontWeight: '700', paddingHorizontal: spacing.md },
  navArrowDisabled: { color: colors.line },
  dateText: { fontSize: 14.5, fontWeight: '700', color: colors.ink, minWidth: 140, textAlign: 'center' },
  textArea: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 14.5,
    color: colors.ink,
    lineHeight: 21,
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  savedHint: { fontSize: 11.5, color: colors.inkFaint },
  saveBtn: { backgroundColor: colors.ink, borderRadius: radius.md, paddingHorizontal: 22, paddingVertical: 12 },
  saveBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
});
