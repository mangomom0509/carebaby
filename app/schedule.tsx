import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import {
  addScheduleTemplateItem,
  deleteScheduleTemplateItem,
  listScheduleLogForDate,
  listScheduleTemplate,
  logScheduleItem,
  unlogScheduleItem,
} from '../lib/api/schedule';
import { toISO, todayStart } from '../lib/dates';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';
import type { ScheduleLogEntry, ScheduleTemplateItem } from '../lib/types';

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function diffLabel(planned: string, actual: string): string {
  const diff = minutesOf(actual) - minutesOf(planned);
  if (diff === 0) return '정시';
  return diff > 0 ? `+${diff}분` : `${diff}분`;
}

export default function ScheduleScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const todayIso = useMemo(() => toISO(todayStart()), []);
  const [template, setTemplate] = useState<ScheduleTemplateItem[]>([]);
  const [logs, setLogs] = useState<Record<string, ScheduleLogEntry>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingItem, setEditingItem] = useState<ScheduleTemplateItem | null>(null);
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    if (!child) return;
    const [tpl, log] = await Promise.all([listScheduleTemplate(child.id), listScheduleLogForDate(child.id, todayIso)]);
    setTemplate(tpl);
    const map: Record<string, ScheduleLogEntry> = {};
    for (const l of log) map[l.item_id] = l;
    setLogs(map);
    setLoading(false);
  }, [child, todayIso]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!child) return;
    const channel = supabase
      .channel(`schedule-${child.id}-${todayIso}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_log', filter: `child_id=eq.${child.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [child, todayIso, load]);

  const toggle = async (item: ScheduleTemplateItem) => {
    if (!child) return;
    setBusyId(item.id);
    try {
      if (logs[item.id]) {
        await unlogScheduleItem(item.id, todayIso);
      } else {
        await logScheduleItem({ childId: child.id, itemId: item.id, date: todayIso, startTime: nowTime() });
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (item: ScheduleTemplateItem) => {
    if (manageMode) return;
    const log = logs[item.id];
    setEditingItem(item);
    setEditTime(log ? log.start_time : nowTime());
  };

  const saveEdit = async () => {
    if (!child || !editingItem) return;
    if (!/^\d{2}:\d{2}$/.test(editTime)) return;
    setSavingEdit(true);
    try {
      await logScheduleItem({ childId: child.id, itemId: editingItem.id, date: todayIso, startTime: editTime });
      setEditingItem(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  };

  const removeItem = async (id: string) => {
    setBusyId(id);
    try {
      await deleteScheduleTemplateItem(id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const addItem = async () => {
    if (!child) return;
    const valid = /^\d{2}:\d{2}$/.test(newTime) && newLabel.trim().length > 0;
    if (!valid) return;
    setBusyId('new');
    try {
      await addScheduleTemplateItem({ childId: child.id, time: newTime, label: newLabel.trim() });
      setNewTime('');
      setNewLabel('');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (!child) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>오늘의 스케줄</Text>
        <TouchableOpacity onPress={() => setManageMode((v) => !v)} hitSlop={10}>
          <Text style={styles.manageToggle}>{manageMode ? '완료' : '관리'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
          {template.length === 0 ? (
            <Text style={styles.empty}>아직 등록된 스케줄이 없어요. 관리 모드에서 추가해보세요.</Text>
          ) : (
            template.map((item) => {
              const log = logs[item.id];
              return (
                <View key={item.id} style={styles.row}>
                  <TouchableOpacity onPress={() => toggle(item)} disabled={busyId === item.id} hitSlop={8}>
                    <View style={[styles.checkbox, log && styles.checkboxDone]}>
                      {log ? <Text style={styles.checkboxMark}>✓</Text> : null}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rowMain} onPress={() => (log ? openEdit(item) : toggle(item))} disabled={busyId === item.id}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowTime}>
                      예정 {item.time}
                      {log ? ` · 실제 ${log.start_time} (${diffLabel(item.time, log.start_time)}) · 수정` : ' · 눌러서 기록'}
                    </Text>
                  </TouchableOpacity>
                  {busyId === item.id ? <ActivityIndicator size="small" color={colors.ink} /> : null}
                  {manageMode ? (
                    <TouchableOpacity onPress={() => removeItem(item.id)} disabled={busyId === item.id} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>삭제</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          )}

          {manageMode ? (
            <View style={styles.addForm}>
              <Text style={styles.addFormTitle}>새 스케줄 추가</Text>
              <View style={styles.addFormRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={newTime}
                  onChangeText={setNewTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newLabel}
                  onChangeText={setNewLabel}
                  placeholder="예: 낮잠"
                  placeholderTextColor={colors.inkFaint}
                />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={addItem} disabled={busyId === 'new'}>
                {busyId === 'new' ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={styles.addBtnText}>추가하기</Text>}
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}

      {editingItem ? (
        <Modal animationType="slide" transparent onRequestClose={() => setEditingItem(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.lg }]}>
              <Text style={styles.modalTitle}>{editingItem.label} 시간 수정</Text>
              <Text style={styles.modalSubtitle}>실제로 한 시간을 직접 입력해주세요.</Text>
              <TextInput
                style={styles.timeEditInput}
                value={editTime}
                onChangeText={setEditTime}
                placeholder="HH:MM"
                placeholderTextColor={colors.inkFaint}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                autoFocus
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setEditingItem(null)}>
                  <Text style={styles.modalBtnGhostText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtn} onPress={saveEdit} disabled={savingEdit}>
                  {savingEdit ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={styles.modalBtnText}>저장</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    back: { fontSize: 14, color: colors.inkSoft, fontWeight: '600' },
    title: { fontSize: 17, fontWeight: '800', color: colors.ink },
    manageToggle: { fontSize: 13, color: colors.accent, fontWeight: '700' },
    empty: { textAlign: 'center', color: colors.inkFaint, fontSize: 12.5, marginTop: spacing.xl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      marginBottom: spacing.sm,
      padding: spacing.md,
    },
    rowMain: { flex: 1 },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkboxMark: { color: colors.accentOn, fontSize: 14, fontWeight: '800' },
    rowLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
    rowTime: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
    deleteBtn: { paddingHorizontal: spacing.xs },
    deleteBtnText: { fontSize: 12, color: colors.inkFaint, fontWeight: '700' },
    addForm: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    addFormTitle: { fontSize: 13, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
    addFormRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    input: {
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13.5,
      color: colors.ink,
    },
    timeInput: { width: 84, textAlign: 'center' },
    addBtn: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
    addBtnText: { color: colors.bg, fontSize: 13, fontWeight: '700' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 4 },
    modalSubtitle: { fontSize: 12.5, color: colors.inkSoft, marginBottom: spacing.lg },
    timeEditInput: {
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      paddingVertical: 14,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
      color: colors.ink,
      letterSpacing: 2,
    },
    modalBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    modalBtn: { flex: 1, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
    modalBtnGhost: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.line },
    modalBtnText: { color: colors.bg, fontSize: 14, fontWeight: '700' },
    modalBtnGhostText: { color: colors.inkSoft, fontSize: 14, fontWeight: '700' },
  });
}
