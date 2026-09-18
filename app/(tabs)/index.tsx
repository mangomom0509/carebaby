import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { listDoneVaccines } from '../../lib/api/vaccines';
import { listScheduleLogForDate, listScheduleTemplate } from '../../lib/api/schedule';
import { listRecordsForDate } from '../../lib/api/records';
import { listGrowthRecords } from '../../lib/api/growth';
import { listTodos, addTodo, deleteTodo, setTodoDone } from '../../lib/api/todos';
import { getDailyNote, saveDailyNote, setDailyNoteAck } from '../../lib/api/daily-notes';
import { ageDays, ageMonths, dPlus, parseISO, toISO, todayStart } from '../../lib/dates';
import { computeCurrentStatus, nextByKind, toMin, type CurrentStatus } from '../../lib/schedule-status';
import { nextPendingVisit } from '../../lib/vaccines';
import { weightPercentile } from '../../lib/growth-standards';
import { DEV_MILESTONES } from '../../lib/dev-milestones';
import { listDoneDevChecks } from '../../lib/api/dev-checks';
import { Icon } from '../../lib/icons';
import { useTheme } from '../../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../../lib/theme';
import type { RecordEntry, ScheduleLogEntry, ScheduleTemplateItem, Todo, DailyNote, VaccineDose, DevCheck, GrowthRecord } from '../../lib/types';

function topicParticle(name: string): string {
  const last = name[name.length - 1] || '';
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '는';
  return (code - 0xac00) % 28 !== 0 ? '은' : '는';
}

function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function ddayLabel(dueDate: Date, today: Date): string {
  const diff = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'D-DAY';
  if (diff > 0) return `D-${diff}`;
  return `${Math.abs(diff)}일 지남`;
}

const STATUS_META: Record<CurrentStatus, { phrase: string; icon: 'sleep' | 'meal' | 'play'; iconName: 'sleep' | 'feed' | 'play' }> = {
  sleep: { phrase: '자는 중', icon: 'sleep', iconName: 'sleep' },
  meal: { phrase: '밥 먹는 중', icon: 'meal', iconName: 'feed' },
  play: { phrase: '노는 중', icon: 'play', iconName: 'play' },
};

const NOTE_AUTHORS = ['엄마', '아빠', '돌봄이'];

const DEV_GROUPS: (typeof DEV_MILESTONES)[] = (() => {
  const map = new Map<string, typeof DEV_MILESTONES>();
  for (const m of DEV_MILESTONES) {
    const list = map.get(m.ageGroup) ?? [];
    list.push(m);
    map.set(m.ageGroup, list);
  }
  return Array.from(map.values());
})();

export default function HomeScreen() {
  const { child, family, membership } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const todayIso = useMemo(() => toISO(todayStart()), []);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<ScheduleTemplateItem[]>([]);
  const [logs, setLogs] = useState<Record<string, ScheduleLogEntry>>({});
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [doneVaccineIds, setDoneVaccineIds] = useState<Set<string>>(new Set());
  const [doneDevIds, setDoneDevIds] = useState<Set<string>>(new Set());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([]);
  const [note, setNote] = useState<DailyNote | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteAuthor, setNoteAuthor] = useState(NOTE_AUTHORS[0]);
  const [savingNote, setSavingNote] = useState(false);
  const [newTodoLabel, setNewTodoLabel] = useState('');

  const load = useCallback(async () => {
    if (!child || !family) return;
    setLoading(true);
    try {
      const [tpl, log, recs, doneVax, doneDev, todoRows, noteRow, growthRows] = await Promise.all([
        listScheduleTemplate(child.id),
        listScheduleLogForDate(child.id, todayIso),
        listRecordsForDate(child.id, todayIso),
        listDoneVaccines(child.id),
        listDoneDevChecks(child.id),
        listTodos(family.id),
        getDailyNote(child.id, todayIso),
        listGrowthRecords(child.id),
      ]);
      setTemplate(tpl);
      const logMap: Record<string, ScheduleLogEntry> = {};
      for (const l of log) logMap[l.item_id] = l;
      setLogs(logMap);
      setRecords(recs);
      setDoneVaccineIds(new Set(doneVax.map((v: VaccineDose) => v.vaccine_id)));
      setDoneDevIds(new Set(doneDev.map((d: DevCheck) => d.milestone_id)));
      setTodos(todoRows);
      setNote(noteRow);
      setGrowthRecords(growthRows);
    } finally {
      setLoading(false);
    }
  }, [child, family, todayIso]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!child || !family) return;
    const channel = supabase
      .channel(`home-${child.id}-${family.id}-${todayIso}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_log', filter: `child_id=eq.${child.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `child_id=eq.${child.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos', filter: `family_id=eq.${family.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_notes', filter: `child_id=eq.${child.id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [child, family, todayIso, load]);

  const toggleTodo = async (todo: Todo) => {
    await setTodoDone(todo.id, !todo.done);
    await load();
  };
  const removeTodo = async (id: string) => {
    await deleteTodo(id);
    await load();
  };
  const submitTodo = async () => {
    if (!family || !newTodoLabel.trim() || todos.length >= 4) return;
    await addTodo(family.id, newTodoLabel.trim());
    setNewTodoLabel('');
    await load();
  };

  const openNoteModal = () => {
    setNoteAuthor(note?.author ?? NOTE_AUTHORS[0]);
    setNoteText(note?.text ?? '');
    setNoteModalOpen(true);
  };
  const saveNote = async () => {
    if (!child || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const now = new Date();
      const ap = now.getHours() < 12 ? '오전' : '오후';
      const hh = now.getHours() % 12 || 12;
      const noteTime = `${ap} ${hh}:${String(now.getMinutes()).padStart(2, '0')}`;
      await saveDailyNote({ childId: child.id, date: todayIso, text: noteText.trim(), author: noteAuthor, noteTime });
      setNoteModalOpen(false);
      await load();
    } finally {
      setSavingNote(false);
    }
  };
  const toggleAck = async () => {
    if (!child || !note) return;
    await setDailyNoteAck(child.id, todayIso, !note.ack);
    await load();
  };

  if (!child) return null;

  const birth = parseISO(child.birth);
  const today = todayStart();
  const months = ageMonths(birth, today);
  const days = dPlus(birth, today);
  const nowMin = toMin(`${new Date().getHours()}:${new Date().getMinutes()}`);

  const currentStatus = computeCurrentStatus(template, logs, nowMin);
  const statusMeta = STATUS_META[currentStatus];
  const nextMeal = nextByKind(template, logs, 'meal', nowMin);
  const nextSleep = nextByKind(template, logs, 'sleep', nowMin);

  const todayTemps = records.filter((r) => r.type === 'temp').sort((a, b) => a.time.localeCompare(b.time));
  const lastTemp = todayTemps[todayTemps.length - 1];
  const isFever = lastTemp ? Number(lastTemp.amount) >= 37.5 : false;

  const latestGrowth = growthRecords.slice().sort((a, b) => (a.measured_date < b.measured_date ? -1 : 1))[growthRecords.length - 1];
  const growthPct = latestGrowth?.weight_kg != null ? weightPercentile(child.gender, ageDays(birth, parseISO(latestGrowth.measured_date)), latestGrowth.weight_kg) : null;

  const nextVisit = nextPendingVisit(birth, doneVaccineIds);
  const visitImminent = nextVisit ? Math.round((nextVisit.dueDate.getTime() - today.getTime()) / 86400000) <= 7 : false;
  const visitLabel = nextVisit
    ? nextVisit.doses.length > 1
      ? `${nextVisit.doses.length}종 동시 접종`
      : `${nextVisit.doses[0].vaccineName} ${nextVisit.doses[0].doseLabel}`
    : null;

  const currentMonthsExact = months;
  const dueGroup =
    DEV_GROUPS.find((g) => currentMonthsExact >= g[0].ageMonths && g.some((m) => !doneDevIds.has(m.id))) ??
    DEV_GROUPS.slice().reverse().find((g) => currentMonthsExact >= g[0].ageMonths) ??
    DEV_GROUPS.find((g) => currentMonthsExact < g[0].ageMonths) ??
    null;
  const devDone = dueGroup ? dueGroup.filter((m) => doneDevIds.has(m.id)).length : 0;
  const devTotal = dueGroup ? dueGroup.length : 0;
  const devShown = dueGroup ? dueGroup.slice(0, 3) : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Icon name="person" size={24} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{child.name}</Text>
          <Text style={styles.age}>
            {months}개월 · D+{days}
          </Text>
        </View>
        <View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => setBellOpen((v) => !v)}>
            <Icon name="bell" size={19} color={colors.ink} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
          {bellOpen ? (
            <>
              <View style={styles.bellPop}>
                <View style={styles.bellItem}>
                  <Text style={styles.bellItemTitle}>
                    {nextVisit ? `${visitLabel} ${ddayLabel(nextVisit.dueDate, today)}` : '예정된 접종 없음'}
                  </Text>
                  <Text style={styles.bellItemDesc}>가까운 예방접종 알림</Text>
                </View>
                <View style={[styles.bellItem, styles.bellItemBorder]}>
                  <Text style={styles.bellItemTitle}>오늘의 기록을 남겨보세요</Text>
                  <Text style={styles.bellItemDesc}>기록 탭에서 타임라인에 추가할 수 있어요</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>

      {bellOpen ? (
        <TouchableWithoutFeedback onPress={() => setBellOpen(false)}>
          <View style={styles.bellOverlay} />
        </TouchableWithoutFeedback>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.statusTile}>
              <View style={[styles.statusIcon]}>
                <Icon name={statusMeta.iconName} size={19} color={colors.accentInk} />
              </View>
              <Text style={styles.statusText}>
                {child.name}
                {topicParticle(child.name)} 지금 {statusMeta.phrase}이에요
              </Text>
            </View>
            <Text style={styles.cardHint}>다음 일과</Text>
            <View style={styles.todayGrid}>
              {nextMeal ? (
                <View style={styles.todayTile}>
                  <Text style={styles.tlLabel}>다음 식사</Text>
                  <Text style={styles.tlTime}>{nextMeal.time}</Text>
                  <Text style={styles.tlSub}>{nextMeal.label}</Text>
                </View>
              ) : (
                <View style={[styles.todayTile, styles.todayTileEmpty]}>
                  <Text style={styles.tlSub}>오늘 식사 일정{'\n'}완료</Text>
                </View>
              )}
              {nextSleep ? (
                <View style={styles.todayTile}>
                  <Text style={styles.tlLabel}>다음 잠</Text>
                  <Text style={styles.tlTime}>{nextSleep.time}</Text>
                  <Text style={styles.tlSub}>{nextSleep.label}</Text>
                </View>
              ) : (
                <View style={[styles.todayTile, styles.todayTileEmpty]}>
                  <Text style={styles.tlSub}>오늘 잠 일정{'\n'}완료</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/schedule')}>
              <Text style={styles.todayHint}>우리 아이 기본 일과예요 · 눌러서 스케줄 편집</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.eyebrow}>건강</Text>
              <TouchableOpacity onPress={() => router.push('/vaccines')}>
                <Text style={styles.histLink}>전체 기록</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: spacing.sm }}>
              <TouchableOpacity
                style={[styles.pill, lastTemp ? (isFever ? styles.pillDanger : styles.pillGood) : styles.pillNeutral]}
                onPress={() => router.push('/(tabs)/record')}
              >
                <Text style={[styles.pillLabel, lastTemp ? (isFever ? styles.pillDangerText : styles.pillGoodText) : styles.pillNeutralText]}>
                  {lastTemp ? `체온 ${Number(lastTemp.amount).toFixed(1)}°C` : '체온 미기록'}
                </Text>
                <Text style={[styles.pillSub, lastTemp ? (isFever ? styles.pillDangerText : styles.pillGoodText) : styles.pillNeutralText]}>
                  {lastTemp ? (isFever ? '발열 의심' : '정상') : '눌러서 입력'}
                </Text>
                {lastTemp ? <Text style={styles.pillMeta}>{lastTemp.time} 측정</Text> : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, nextVisit ? (visitImminent ? styles.pillAlert : styles.pillGood) : styles.pillGood]}
                onPress={() => router.push('/vaccines')}
              >
                <Text style={[styles.pillLabel, nextVisit ? (visitImminent ? styles.pillAlertText : styles.pillGoodText) : styles.pillGoodText]}>
                  {nextVisit ? (visitImminent ? '예방접종 임박' : '다음 예방접종') : '예방접종'}
                </Text>
                <Text style={[styles.pillSub, nextVisit ? (visitImminent ? styles.pillAlertText : styles.pillGoodText) : styles.pillGoodText]}>
                  {nextVisit ? visitLabel : '모두 완료'}
                </Text>
                {nextVisit ? <Text style={styles.pillMeta}>{fmtMD(nextVisit.dueDate)}</Text> : null}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pill, latestGrowth ? styles.pillGood : styles.pillNeutral]} onPress={() => router.push('/growth')}>
                <Text style={[styles.pillLabel, latestGrowth ? styles.pillGoodText : styles.pillNeutralText]}>
                  {latestGrowth?.weight_kg != null ? `몸무게 ${latestGrowth.weight_kg}kg` : '성장 기록'}
                </Text>
                <Text style={[styles.pillSub, latestGrowth ? styles.pillGoodText : styles.pillNeutralText]}>
                  {growthPct ? `또래 100명 중 ${growthPct.percentile}번째` : latestGrowth ? '' : '눌러서 입력'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>발달 체크 · WHO 대근육 기준 포함</Text>
            {dueGroup ? (
              <>
                <View style={styles.devHead}>
                  <Text style={styles.devTitle}>{dueGroup[0].ageGroup} 발달 체크</Text>
                  <Text style={styles.devFrac}>
                    {devDone}/{devTotal}
                  </Text>
                </View>
                <View style={styles.devTrack}>
                  <View style={[styles.devFill, { width: `${devTotal ? Math.round((devDone / devTotal) * 100) : 0}%` }]} />
                </View>
                <View style={{ gap: spacing.sm }}>
                  {devShown.map((m) => {
                    const done = doneDevIds.has(m.id);
                    return (
                      <View key={m.id} style={styles.devItem}>
                        <View style={[styles.devBox, done && styles.devBoxDone]}>{done ? <Icon name="check" size={11} color={colors.accentOn} /> : null}</View>
                        <Text style={[styles.devLbl, done && styles.devLblDone]}>{m.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text style={styles.cardHint}>등록된 발달 이정표를 모두 확인했어요.</Text>
            )}
            <TouchableOpacity onPress={() => router.push('/dev-check')}>
              <Text style={[styles.histLink, { marginTop: spacing.md }]}>체크리스트 전체 보기 →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>오늘 할 일</Text>
            <View>
              {todos.length === 0 ? (
                <Text style={styles.emptyNote}>오늘 챙길 일이 없어요.</Text>
              ) : (
                todos.map((t) => (
                  <View key={t.id} style={styles.todoRow}>
                    <TouchableOpacity style={[styles.todoBox, t.done && styles.todoBoxDone]} onPress={() => toggleTodo(t)}>
                      {t.done ? <Icon name="check" size={11} color={colors.accentOn} /> : null}
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleTodo(t)}>
                      <Text style={[styles.todoLbl, t.done && styles.todoLblDone]}>{t.label}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeTodo(t.id)} hitSlop={8}>
                      <Icon name="x" size={13} color={colors.inkFaint} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
            {todos.length < 4 ? (
              <View style={styles.todoAddRow}>
                <TextInput
                  style={styles.todoInput}
                  value={newTodoLabel}
                  onChangeText={setNewTodoLabel}
                  placeholder="할 일 추가 (예: 기저귀 사기)"
                  placeholderTextColor={colors.inkFaint}
                  onSubmitEditing={submitTodo}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.todoAddBtn} onPress={submitTodo}>
                  <Icon name="plus" size={16} color={colors.accentOn} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.cardHint}>할 일은 최대 4개까지 담을 수 있어요.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>오늘의 한마디</Text>
            {note ? (
              <TouchableOpacity style={styles.noteCardH} onPress={openNoteModal}>
                <Text style={styles.noteTextH}>{note.text}</Text>
                <View style={styles.noteMetaH}>
                  <Text style={styles.noteMetaText}>
                    {note.author}가 남김 · {note.note_time}
                  </Text>
                  <TouchableOpacity
                    style={[styles.noteAckBtn, note.ack && styles.noteAckBtnActive]}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleAck();
                    }}
                  >
                    <Text style={[styles.noteAckText, note.ack && styles.noteAckTextActive]}>{note.ack ? '확인함 ✓' : '확인했어요'}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xs }}>
                <Text style={styles.noteEmptyText}>오늘 아이 컨디션을 한 줄로 남겨보세요.</Text>
                <TouchableOpacity style={styles.pillBtn} onPress={openNoteModal}>
                  <Text style={styles.pillBtnText}>한마디 남기기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}

      <Modal visible={noteModalOpen} animationType="slide" transparent onRequestClose={() => setNoteModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.modalTitle}>오늘의 한마디</Text>
            <Text style={styles.modalSub}>오늘 아이 컨디션이나 특이사항을 한 줄로 남겨보세요.</Text>
            <Text style={styles.fieldLabel}>작성자</Text>
            <View style={styles.radioRow}>
              {NOTE_AUTHORS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.radioChip, noteAuthor === a && styles.radioChipActive]}
                  onPress={() => setNoteAuthor(a)}
                >
                  <Text style={[styles.radioChipText, noteAuthor === a && styles.radioChipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>한마디</Text>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="예: 오늘 낮잠을 평소보다 적게 잤어요"
              placeholderTextColor={colors.inkFaint}
              multiline
            />
            <TouchableOpacity style={styles.modalBtn} onPress={saveNote} disabled={savingNote}>
              {savingNote ? <ActivityIndicator color={colors.accentOn} /> : <Text style={styles.modalBtnText}>저장하기</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.peach,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: { fontSize: 17, fontWeight: '800', color: colors.ink },
    age: { fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
    bellBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellDot: {
      position: 'absolute',
      top: 7,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.accent,
      borderWidth: 1.5,
      borderColor: colors.card,
    },
    bellOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 15 },
    bellPop: {
      position: 'absolute',
      top: 44,
      right: 0,
      width: 230,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 14,
      padding: 8,
      zIndex: 20,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    bellItem: { padding: 9 },
    bellItemBorder: { borderTopWidth: 1, borderTopColor: colors.line },
    bellItemTitle: { fontSize: 12.5, fontWeight: '700', color: colors.ink, marginBottom: 2 },
    bellItemDesc: { fontSize: 11.5, color: colors.inkSoft },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: 18,
      marginBottom: spacing.md,
    },
    eyebrow: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4, color: colors.inkSoft, textTransform: 'uppercase', marginBottom: 13 },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    histLink: { fontSize: 11.5, fontWeight: '700', color: colors.accent },
    statusTile: { backgroundColor: colors.peach, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    statusText: { fontWeight: '800', fontSize: 16.5, color: colors.ink, flex: 1, lineHeight: 22 },
    cardHint: { fontSize: 11.5, fontWeight: '700', color: colors.inkFaint, marginTop: 14, marginBottom: 8 },
    todayGrid: { flexDirection: 'row', gap: 10 },
    todayTile: { flex: 1, backgroundColor: colors.peach, borderRadius: 14, padding: 10, minHeight: 70, justifyContent: 'center' },
    todayTileEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed' },
    tlLabel: { fontSize: 11, fontWeight: '700', color: colors.accentInk, marginBottom: 4 },
    tlTime: { fontWeight: '800', fontSize: 20, color: colors.accent },
    tlSub: { fontSize: 10.5, color: colors.inkSoft, marginTop: 6, textAlign: 'center' },
    todayHint: { fontSize: 11, color: colors.inkFaint, marginTop: 11 },
    pill: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
    pillGood: { backgroundColor: colors.peach },
    pillGoodText: { color: colors.accentInk },
    pillAlert: { backgroundColor: colors.peach },
    pillAlertText: { color: colors.accentInk },
    pillDanger: { backgroundColor: colors.feverBg },
    pillDangerText: { color: colors.feverInk },
    pillNeutral: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed' },
    pillNeutralText: { color: colors.inkSoft },
    pillLabel: { fontSize: 12.5, fontWeight: '700' },
    pillSub: { fontSize: 12.5 },
    pillMeta: { marginLeft: 'auto', fontSize: 11, color: colors.inkSoft },
    devHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 },
    devTitle: { fontSize: 14.5, fontWeight: '700', color: colors.ink },
    devFrac: { fontWeight: '800', fontSize: 14, color: colors.accentInk },
    devTrack: { height: 6, backgroundColor: colors.line, borderRadius: 99, overflow: 'hidden', marginBottom: 12 },
    devFill: { height: '100%', backgroundColor: colors.peachDeep, borderRadius: 99 },
    devItem: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    devBox: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
    devBoxDone: { backgroundColor: colors.accent, borderColor: colors.accent },
    devLbl: { fontSize: 13, color: colors.ink, flex: 1 },
    devLblDone: { color: colors.inkFaint, textDecorationLine: 'line-through' },
    emptyNote: { color: colors.inkFaint, fontSize: 12.5, paddingVertical: 6 },
    todoRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
    todoBox: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
    todoBoxDone: { backgroundColor: colors.accent, borderColor: colors.accent },
    todoLbl: { fontSize: 13, color: colors.ink },
    todoLblDone: { color: colors.inkFaint, textDecorationLine: 'line-through' },
    todoAddRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
    todoInput: {
      flex: 1,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.card,
      color: colors.ink,
      fontSize: 13,
    },
    todoAddBtn: { width: 36, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    noteCardH: { backgroundColor: colors.peach, borderRadius: 14, padding: 13 },
    noteTextH: { fontSize: 13, lineHeight: 19, color: colors.ink, marginBottom: 9 },
    noteMetaH: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    noteMetaText: { fontSize: 11, color: colors.inkSoft },
    noteAckBtn: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
    noteAckBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    noteAckText: { fontSize: 11.5, fontWeight: '700', color: colors.ink },
    noteAckTextActive: { color: colors.accentOn },
    noteEmptyText: { fontSize: 12.5, color: colors.inkSoft, marginBottom: 12 },
    pillBtn: { borderWidth: 1.5, borderColor: colors.accent, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 11 },
    pillBtnText: { color: colors.accent, fontSize: 12.5, fontWeight: '700' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,20,25,0.4)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
    modalTitle: { fontSize: 16.5, fontWeight: '800', color: colors.ink, marginBottom: 4 },
    modalSub: { fontSize: 12.5, color: colors.inkSoft, marginBottom: 18 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 7 },
    radioRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    radioChip: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
    radioChipActive: { borderColor: colors.peachDeep, backgroundColor: colors.peach },
    radioChipText: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
    radioChipTextActive: { color: colors.accentInk },
    noteInput: {
      minHeight: 64,
      borderWidth: 1.5,
      borderColor: colors.line,
      borderRadius: 13,
      padding: 13,
      fontSize: 13.5,
      color: colors.ink,
      backgroundColor: colors.card,
      marginBottom: 18,
      textAlignVertical: 'top',
    },
    modalBtn: { backgroundColor: colors.accent, borderRadius: 15, paddingVertical: 15, alignItems: 'center' },
    modalBtnText: { color: colors.accentOn, fontSize: 16, fontWeight: '700' },
  });
}
