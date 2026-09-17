import { useCallback, useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { setRegularPattern } from '../../lib/api/children';
import { getDiaryEntry, saveDiaryEntry } from '../../lib/api/diary';
import { deletePhotoForDate, getPhotoForDate, getSignedUrls, uploadPhotoForDate } from '../../lib/api/photos';
import { addRecord, listRecordsForDate } from '../../lib/api/records';
import { listScheduleLogForDate, listScheduleTemplate, logScheduleItem, unlogScheduleItem } from '../../lib/api/schedule';
import { getDietGuide, getSleepGuide } from '../../lib/care-guides';
import { ageMonths, parseISO, toISO, todayStart } from '../../lib/dates';
import { Icon, type IconName } from '../../lib/icons';
import { AMOUNT_LEVELS, isFeedLabel, isGramMealLabel, isSnackLabel, isWaterLabel, scheduleAmountUnit } from '../../lib/schedule-labels';
import { useTheme } from '../../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../../lib/theme';
import type { PhotoEntry, RecordEntry, RecordType, ScheduleLogEntry, ScheduleTemplateItem } from '../../lib/types';

interface TypeMeta {
  label: string;
  icon: IconName;
  color: string;
}

function createTypeMeta(colors: ColorPalette): Record<RecordType, TypeMeta> {
  return {
    feed: { label: '수유', icon: 'feed', color: colors.accentInk },
    water: { label: '물', icon: 'water', color: colors.accentInk },
    meal: { label: '이유식', icon: 'meal', color: colors.accentInk },
    kidmeal: { label: '유아식', icon: 'meal', color: colors.accentInk },
    snack: { label: '간식', icon: 'snack', color: colors.accentInk },
    routine: { label: '일과', icon: 'star', color: colors.accentInk },
    sleep: { label: '수면', icon: 'sleep', color: colors.accentInk },
    diaper: { label: '배변', icon: 'diaper', color: colors.accentInk },
    shot: { label: '접종', icon: 'shot', color: colors.accentInk },
    temp: { label: '체온', icon: 'temp', color: colors.accentInk },
  };
}

const FAB_TYPES: RecordType[] = ['feed', 'water', 'meal', 'kidmeal', 'snack', 'routine', 'sleep', 'diaper', 'shot', 'temp'];

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtScheduleTime(item: ScheduleTemplateItem): string {
  return item.end_time ? `${item.time}~${item.end_time}` : item.time;
}

export default function RecordScreen() {
  const { child, refresh } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const typeMeta = useMemo(() => createTypeMeta(colors), [colors]);

  const todayIso = useMemo(() => toISO(todayStart()), []);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<ScheduleTemplateItem[]>([]);
  const [logs, setLogs] = useState<Record<string, ScheduleLogEntry>>({});
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [photo, setPhoto] = useState<PhotoEntry | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [diaryText, setDiaryText] = useState('');
  const [diarySavedAt, setDiarySavedAt] = useState<string | null>(null);
  const [savingDiary, setSavingDiary] = useState(false);

  const [editingItem, setEditingItem] = useState<ScheduleTemplateItem | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editLevel, setEditLevel] = useState(AMOUNT_LEVELS[1]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [fabOpen, setFabOpen] = useState(false);
  const [newType, setNewType] = useState<RecordType>('feed');
  const [newTime, setNewTime] = useState(nowTime());
  const [newAmount, setNewAmount] = useState('');
  const [newSub, setNewSub] = useState('소변');
  const [savingNew, setSavingNew] = useState(false);

  const load = useCallback(async () => {
    if (!child) return;
    setLoading(true);
    try {
      const [tpl, log, recs, photoEntry, diary] = await Promise.all([
        listScheduleTemplate(child.id),
        listScheduleLogForDate(child.id, todayIso),
        listRecordsForDate(child.id, todayIso),
        getPhotoForDate(child.id, todayIso),
        getDiaryEntry(child.id, todayIso),
      ]);
      setTemplate(tpl);
      const logMap: Record<string, ScheduleLogEntry> = {};
      for (const l of log) logMap[l.item_id] = l;
      setLogs(logMap);
      setRecords(recs);
      setPhoto(photoEntry);
      if (photoEntry) {
        const urls = await getSignedUrls([photoEntry.storage_path]);
        setPhotoUrl(urls[photoEntry.storage_path]);
      } else {
        setPhotoUrl(undefined);
      }
      setDiaryText(diary?.text ?? '');
      setDiarySavedAt(diary?.updated_at ?? null);
    } finally {
      setLoading(false);
    }
  }, [child, todayIso]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!child) return;
    const channel = supabase
      .channel(`record-${child.id}-${todayIso}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_log', filter: `child_id=eq.${child.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `child_id=eq.${child.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `child_id=eq.${child.id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [child, todayIso, load]);

  const setMode = async (regular: boolean) => {
    if (!child || child.regular_pattern === regular) return;
    await setRegularPattern(child.id, regular);
    await refresh();
  };

  const openEdit = (item: ScheduleTemplateItem) => {
    const log = logs[item.id];
    setEditingItem(item);
    setEditTime(log ? log.start_time : nowTime());
    setEditAmount(log?.amount != null ? String(log.amount) : item.default_amount != null ? String(item.default_amount) : '');
    setEditLevel(log?.level ?? AMOUNT_LEVELS[1]);
  };

  const saveEdit = async () => {
    if (!child || !editingItem) return;
    if (!/^\d{1,2}:\d{2}$/.test(editTime)) return;
    setSavingEdit(true);
    try {
      const unit = scheduleAmountUnit(editingItem.label);
      const isLevelType = !unit && !isSnackLabel(editingItem.label);
      await logScheduleItem({
        childId: child.id,
        itemId: editingItem.id,
        date: todayIso,
        startTime: editTime,
        amount: unit ? Number(editAmount) || 0 : null,
        level: isLevelType ? editLevel : null,
      });
      setEditingItem(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  };

  const clearEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      await unlogScheduleItem(editingItem.id, todayIso);
      setEditingItem(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  };

  const pickAndUploadPhoto = async () => {
    if (!child) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한이 필요해요', '사진을 추가하려면 앨범 접근 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setPhotoBusy(true);
    try {
      await uploadPhotoForDate(child.id, todayIso, result.assets[0].base64);
      await load();
    } catch (e) {
      Alert.alert('업로드 실패', e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
    } finally {
      setPhotoBusy(false);
    }
  };
  const removePhoto = async () => {
    if (!child) return;
    setPhotoBusy(true);
    try {
      await deletePhotoForDate(child.id, todayIso);
      await load();
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveDiary = async () => {
    if (!child) return;
    setSavingDiary(true);
    try {
      const entry = await saveDiaryEntry(child.id, todayIso, diaryText);
      setDiarySavedAt(entry.updated_at);
    } finally {
      setSavingDiary(false);
    }
  };

  const openFab = () => {
    setNewType('feed');
    setNewTime(nowTime());
    setNewAmount('');
    setNewSub('소변');
    setFabOpen(true);
  };
  const saveNewRecord = async () => {
    if (!child) return;
    if (!/^\d{1,2}:\d{2}$/.test(newTime)) return;
    setSavingNew(true);
    try {
      const amountTypes: RecordType[] = ['feed', 'water', 'meal', 'kidmeal', 'snack'];
      await addRecord({
        childId: child.id,
        date: todayIso,
        time: newTime,
        type: newType,
        amount: amountTypes.includes(newType) ? Number(newAmount) || 0 : newType === 'temp' ? parseFloat(newAmount) || 0 : null,
        sub: newType === 'diaper' ? newSub : null,
      });
      setFabOpen(false);
      await load();
    } finally {
      setSavingNew(false);
    }
  };

  if (!child) return null;

  const regularPattern = child.regular_pattern;
  const birth = parseISO(child.birth);
  const months = ageMonths(birth, todayStart());

  // Intake tally: schedule_log amounts (regular mode) + ad-hoc records (either mode).
  let feedTotal = 0,
    feedCnt = 0,
    waterTotal = 0,
    waterCnt = 0,
    mealTotal = 0,
    mealCnt = 0,
    mealLevelCnt = 0;
  if (regularPattern) {
    for (const item of template) {
      const log = logs[item.id];
      if (!log) continue;
      if (isFeedLabel(item.label) && log.amount != null) {
        feedTotal += log.amount;
        feedCnt += 1;
      } else if (isWaterLabel(item.label) && log.amount != null) {
        waterTotal += log.amount;
        waterCnt += 1;
      } else if (isGramMealLabel(item.label) && log.amount != null) {
        mealTotal += log.amount;
        mealCnt += 1;
      } else if (!isSnackLabel(item.label) && log.level) {
        mealLevelCnt += 1;
      }
    }
  }
  for (const r of records) {
    if (r.type === 'feed' && r.amount != null) {
      feedTotal += r.amount;
      feedCnt += 1;
    } else if (r.type === 'water' && r.amount != null) {
      waterTotal += r.amount;
      waterCnt += 1;
    } else if ((r.type === 'meal' || r.type === 'kidmeal') && r.amount != null) {
      mealTotal += r.amount;
      mealCnt += 1;
    }
  }

  const existingPhoto = photo;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 3 }}>
        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>스케줄</Text>
          <View style={styles.modeBtns}>
            <TouchableOpacity style={[styles.modeBtn, regularPattern && styles.modeBtnActive]} onPress={() => setMode(true)}>
              <Text style={[styles.modeBtnText, regularPattern && styles.modeBtnTextActive]}>있음</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, !regularPattern && styles.modeBtnActive]} onPress={() => setMode(false)}>
              <Text style={[styles.modeBtnText, !regularPattern && styles.modeBtnTextActive]}>없음</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
        ) : regularPattern ? (
          <View>
            <Text style={styles.sectionTitle}>오늘의 스케줄</Text>
            {template.map((item) => {
              const log = logs[item.id];
              const unit = scheduleAmountUnit(item.label);
              return (
                <TouchableOpacity key={item.id} style={styles.schedRow} onPress={() => openEdit(item)}>
                  <Text style={styles.schedTime}>{fmtScheduleTime(item)}</Text>
                  <Text style={[styles.schedLabel, log && styles.schedLabelDone]}>
                    {item.label}
                    {unit && item.default_amount ? ` ${item.default_amount}${unit}` : ''}
                  </Text>
                  {log ? (
                    <View style={styles.schedActual}>
                      <Icon name="check" size={12} color={colors.accentInk} />
                      <Text style={styles.schedActualText}>
                        {log.start_time}
                        {log.amount != null ? ` · ${log.amount}${unit ?? ''}` : log.level ? ` · ${log.level}` : ''}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.diBtn}>
                      <Text style={styles.diBtnText}>기록</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>타임라인</Text>
            {records.length === 0 ? (
              <Text style={styles.emptyNote}>아직 오늘 기록이 없어요. 오른쪽 아래 + 버튼으로 추가해보세요.</Text>
            ) : (
              records
                .slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((r) => {
                  const meta = typeMeta[r.type];
                  let desc = '';
                  if (r.type === 'feed') desc = `수유 ${r.amount ?? 0}ml`;
                  else if (r.type === 'water') desc = `물 ${r.amount ?? 0}ml`;
                  else if (r.type === 'meal') desc = r.amount != null && r.amount > 0 ? `이유식 ${r.amount}g` : '';
                  else if (r.type === 'kidmeal') desc = `유아식 ${r.amount ?? 0}g`;
                  else if (r.type === 'snack') desc = r.amount != null && r.amount > 0 ? `간식 ${r.amount}g` : '';
                  else if (r.type === 'temp') desc = `체온 ${Number(r.amount ?? 0).toFixed(1)}°C`;
                  else if (r.type === 'diaper') desc = r.sub ?? '';
                  else desc = r.note ?? '';
                  return (
                    <View key={r.id} style={styles.tlItem}>
                      <Text style={styles.tlTime}>{r.time}</Text>
                      <View style={[styles.tlDot, { backgroundColor: colors.line }]}>
                        <Icon name={meta.icon} size={15} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tlTitle}>{meta.label}</Text>
                        {desc ? <Text style={styles.tlDesc}>{desc}</Text> : null}
                      </View>
                    </View>
                  );
                })
            )}
          </View>
        )}

        {feedCnt > 0 || waterCnt > 0 || mealCnt > 0 || mealLevelCnt > 0 ? (
          <>
            <Text style={styles.sectionTitle}>오늘의 섭취량</Text>
            <View style={styles.intakeRow}>
              {feedCnt > 0 ? (
                <View style={styles.intakeTile}>
                  <Text style={styles.intakeLbl}>수유 총량</Text>
                  <Text style={styles.intakeVal}>{feedTotal}ml</Text>
                  <Text style={styles.intakeCnt}>{feedCnt}회</Text>
                </View>
              ) : null}
              {waterCnt > 0 ? (
                <View style={styles.intakeTile}>
                  <Text style={styles.intakeLbl}>물 총량</Text>
                  <Text style={styles.intakeVal}>{waterTotal}ml</Text>
                  <Text style={styles.intakeCnt}>{waterCnt}회</Text>
                </View>
              ) : null}
              {mealCnt > 0 ? (
                <View style={styles.intakeTile}>
                  <Text style={styles.intakeLbl}>이유식 총량</Text>
                  <Text style={styles.intakeVal}>{mealTotal}g</Text>
                  <Text style={styles.intakeCnt}>{mealCnt}회</Text>
                </View>
              ) : null}
            </View>
            {mealLevelCnt > 0 ? <Text style={styles.cardHint}>식사·간식 체크 {mealLevelCnt}건 (오늘의 스케줄에서 확인)</Text> : null}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>오늘의 사진</Text>
        {photoBusy ? (
          <ActivityIndicator color={colors.ink} />
        ) : existingPhoto && photoUrl ? (
          <View>
            <TouchableOpacity onPress={pickAndUploadPhoto}>
              <Image source={{ uri: photoUrl }} style={styles.uploadedPhoto} />
            </TouchableOpacity>
            <View style={styles.photoActions}>
              <TouchableOpacity onPress={pickAndUploadPhoto}>
                <Text style={styles.histLink}>다른 사진으로 변경</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={removePhoto}>
                <Text style={[styles.histLink, styles.deleteLink]}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={pickAndUploadPhoto}>
            <Icon name="camera" size={30} color={colors.inkFaint} />
            <Text style={styles.uploadHint}>하루 1개까지 등록할 수 있어요</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>오늘의 일기</Text>
        <TextInput
          style={styles.diaryInput}
          value={diaryText}
          onChangeText={setDiaryText}
          placeholder="오늘 하루는 어땠나요?"
          placeholderTextColor={colors.inkFaint}
          multiline
          onBlur={saveDiary}
        />
        {savingDiary ? <ActivityIndicator size="small" color={colors.ink} style={{ marginTop: 6 }} /> : null}
        {diarySavedAt && !savingDiary ? (
          <Text style={styles.cardHint}>
            마지막 저장: {new Date(diarySavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>이번 달 가이드</Text>
        <View style={styles.guideRow}>
          <View style={styles.guideCard}>
            <View style={styles.guideTitleRow}>
              <View style={[styles.guideIconDot, { backgroundColor: colors.peach }]}>
                <Icon name="sleep" size={13} color={colors.accentInk} />
              </View>
              <Text style={styles.guideTitle}>수면</Text>
            </View>
            <Text style={styles.guideBody}>{getSleepGuide(months)}</Text>
          </View>
          <View style={styles.guideCard}>
            <View style={styles.guideTitleRow}>
              <View style={[styles.guideIconDot, { backgroundColor: colors.peach }]}>
                <Icon name="meal" size={13} color={colors.accentInk} />
              </View>
              <Text style={styles.guideTitle}>이유식</Text>
            </View>
            <Text style={styles.guideBody}>{getDietGuide(months)}</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={openFab}>
        <Icon name="plus" size={22} color={colors.accentOn} />
      </TouchableOpacity>

      {/* Schedule item edit modal */}
      <Modal visible={!!editingItem} animationType="slide" transparent onRequestClose={() => setEditingItem(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.lg }]}>
            {editingItem ? (
              <>
                <Text style={styles.modalTitle}>{editingItem.label}</Text>
                <Text style={styles.modalSub}>기본 일정은 {fmtScheduleTime(editingItem)}이에요. 오늘 실제 시간을 기록해보세요.</Text>
                <Text style={styles.fieldLabel}>실제 시간</Text>
                <TextInput style={styles.input} value={editTime} onChangeText={setEditTime} placeholder="HH:MM" placeholderTextColor={colors.inkFaint} />
                {scheduleAmountUnit(editingItem.label) ? (
                  <>
                    <Text style={styles.fieldLabel}>{editingItem.label}량 ({scheduleAmountUnit(editingItem.label)})</Text>
                    <TextInput
                      style={styles.input}
                      value={editAmount}
                      onChangeText={setEditAmount}
                      keyboardType="numeric"
                      placeholder="예: 140"
                      placeholderTextColor={colors.inkFaint}
                    />
                  </>
                ) : !isSnackLabel(editingItem.label) ? (
                  <>
                    <Text style={styles.fieldLabel}>얼마나 먹었어요?</Text>
                    <View style={styles.radioRow}>
                      {AMOUNT_LEVELS.map((l) => (
                        <TouchableOpacity key={l} style={[styles.radioChip, editLevel === l && styles.radioChipActive]} onPress={() => setEditLevel(l)}>
                          <Text style={[styles.radioChipText, editLevel === l && styles.radioChipTextActive]}>{l}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : null}
                <TouchableOpacity style={styles.modalBtn} onPress={saveEdit} disabled={savingEdit}>
                  {savingEdit ? <ActivityIndicator color={colors.accentOn} /> : <Text style={styles.modalBtnText}>저장하기</Text>}
                </TouchableOpacity>
                {logs[editingItem.id] ? (
                  <TouchableOpacity style={styles.modalBtnGhost} onPress={clearEdit} disabled={savingEdit}>
                    <Text style={styles.modalBtnGhostText}>기록 삭제</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* New ad-hoc record modal */}
      <Modal visible={fabOpen} animationType="slide" transparent onRequestClose={() => setFabOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.modalTitle}>기록 추가</Text>
            <Text style={styles.modalSub}>시간과 내용을 입력하면 타임라인에 시간순으로 쌓여요.</Text>
            <View style={styles.typeGrid}>
              {FAB_TYPES.map((t) => (
                <TouchableOpacity key={t} style={[styles.typeOpt, newType === t && styles.typeOptActive]} onPress={() => setNewType(t)}>
                  <Icon name={typeMeta[t].icon} size={17} color={newType === t ? colors.accentInk : colors.inkSoft} />
                  <Text style={[styles.typeOptLabel, newType === t && styles.typeOptLabelActive]}>{typeMeta[t].label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>시간</Text>
            <TextInput style={styles.input} value={newTime} onChangeText={setNewTime} placeholder="HH:MM" placeholderTextColor={colors.inkFaint} />
            {(['feed', 'water', 'meal', 'kidmeal', 'snack'] as RecordType[]).includes(newType) ? (
              <>
                <Text style={styles.fieldLabel}>{typeMeta[newType].label}량</Text>
                <TextInput style={styles.input} value={newAmount} onChangeText={setNewAmount} keyboardType="numeric" placeholder="예: 140" placeholderTextColor={colors.inkFaint} />
              </>
            ) : newType === 'temp' ? (
              <>
                <Text style={styles.fieldLabel}>체온 (°C)</Text>
                <TextInput style={styles.input} value={newAmount} onChangeText={setNewAmount} keyboardType="decimal-pad" placeholder="예: 36.6" placeholderTextColor={colors.inkFaint} />
              </>
            ) : newType === 'diaper' ? (
              <>
                <Text style={styles.fieldLabel}>구분</Text>
                <View style={styles.radioRow}>
                  {['소변', '대변'].map((s) => (
                    <TouchableOpacity key={s} style={[styles.radioChip, newSub === s && styles.radioChipActive]} onPress={() => setNewSub(s)}>
                      <Text style={[styles.radioChipText, newSub === s && styles.radioChipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
            <TouchableOpacity style={styles.modalBtn} onPress={saveNewRecord} disabled={savingNew}>
              {savingNew ? <ActivityIndicator color={colors.accentOn} /> : <Text style={styles.modalBtnText}>저장하기</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
    modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    modeLabel: { fontSize: 12.5, fontWeight: '700', color: colors.inkSoft },
    modeBtns: { flexDirection: 'row', backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: 11, padding: 3, gap: 2 },
    modeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
    modeBtnActive: { backgroundColor: colors.accent },
    modeBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.inkSoft },
    modeBtnTextActive: { color: colors.accentOn },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },
    emptyNote: { color: colors.inkFaint, fontSize: 12.5, paddingVertical: spacing.md },
    schedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
    schedTime: { fontWeight: '800', fontSize: 12.5, color: colors.inkSoft, width: 74 },
    schedLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.ink },
    schedLabelDone: { color: colors.inkFaint },
    schedActual: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    schedActualText: { color: colors.accentInk, fontSize: 12, fontWeight: '700' },
    diBtn: { borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9 },
    diBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.ink },
    tlItem: { flexDirection: 'row', gap: 12, paddingVertical: 11 },
    tlTime: { fontSize: 11.5, color: colors.inkFaint, width: 40, paddingTop: 6, fontWeight: '700' },
    tlDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    tlTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
    tlDesc: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
    intakeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    intakeTile: { flex: 1, minWidth: 100, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
    intakeLbl: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '700' },
    intakeVal: { fontSize: 16.5, fontWeight: '800', color: colors.ink, marginTop: 4 },
    intakeCnt: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
    cardHint: { fontSize: 11.5, color: colors.inkFaint, marginTop: 9 },
    uploadBox: { borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 22, alignItems: 'center', backgroundColor: colors.card },
    uploadHint: { fontSize: 12.5, color: colors.inkSoft, marginTop: 8 },
    uploadedPhoto: { width: '100%', aspectRatio: 1.6, borderRadius: 14 },
    photoActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, justifyContent: 'center' },
    histLink: { fontSize: 11.5, fontWeight: '700', color: colors.accent },
    deleteLink: { color: colors.inkFaint },
    diaryInput: {
      minHeight: 76,
      borderWidth: 1.5,
      borderColor: colors.line,
      borderRadius: 13,
      padding: 13,
      fontSize: 13.5,
      color: colors.ink,
      backgroundColor: colors.card,
      textAlignVertical: 'top',
    },
    guideRow: { flexDirection: 'row', gap: 14 },
    guideCard: { flex: 1, backgroundColor: colors.card, borderRadius: 20, padding: 16 },
    guideTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
    guideIconDot: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    guideTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
    guideBody: { fontSize: 12, color: colors.inkSoft, lineHeight: 18 },
    fab: {
      position: 'absolute',
      right: 18,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,20,25,0.4)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, maxHeight: '88%' },
    modalTitle: { fontSize: 16.5, fontWeight: '800', color: colors.ink, marginBottom: 4 },
    modalSub: { fontSize: 12.5, color: colors.inkSoft, marginBottom: 18 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 7, marginTop: 4 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.bg,
      borderRadius: 13,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.ink,
      marginBottom: 8,
    },
    radioRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 8 },
    radioChip: { flex: 1, minWidth: 70, alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
    radioChipActive: { borderColor: colors.peachDeep, backgroundColor: colors.peach },
    radioChipText: { fontSize: 13, fontWeight: '600', color: colors.inkSoft },
    radioChipTextActive: { color: colors.accentInk },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    typeOpt: { width: '30%', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: 13, paddingVertical: 10, backgroundColor: colors.card },
    typeOptActive: { borderColor: colors.accent, backgroundColor: colors.peach },
    typeOptLabel: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft, marginTop: 5 },
    typeOptLabelActive: { color: colors.accentInk },
    modalBtn: { backgroundColor: colors.accent, borderRadius: 15, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
    modalBtnText: { color: colors.accentOn, fontSize: 16, fontWeight: '700' },
    modalBtnGhost: { borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 13, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
    modalBtnGhostText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  });
}
