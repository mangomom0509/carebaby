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
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { listDoneCheckups, markCheckupDone, unmarkCheckupDone } from '../../lib/api/checkups';
import { deletePhotoForDate, getSignedUrls, listPhotosForMonth, uploadPhotoForDate } from '../../lib/api/photos';
import { listRecordsForDate } from '../../lib/api/records';
import { checkupDueDate, CHECKUPS } from '../../lib/checkups';
import { pad, parseISO, toISO, todayStart } from '../../lib/dates';
import { useTheme } from '../../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../../lib/theme';
import type { CheckupDone, PhotoEntry, RecordEntry } from '../../lib/types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const TYPE_LABEL: Record<RecordEntry['type'], string> = {
  feed: '수유',
  water: '물',
  meal: '이유식',
  kidmeal: '유아식',
  snack: '간식',
  sleep: '수면',
  diaper: '기저귀',
  shot: '접종',
  temp: '체온',
  routine: '일과',
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstWeekday(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export default function CalendarScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = useMemo(() => todayStart(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [collageMode, setCollageMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [doneCheckups, setDoneCheckups] = useState<Record<string, CheckupDone>>({});
  const [checkupBusyId, setCheckupBusyId] = useState<string | null>(null);

  const photoByDate = useMemo(() => {
    const map: Record<string, PhotoEntry> = {};
    for (const p of photos) map[p.photo_date] = p;
    return map;
  }, [photos]);

  const birth = child ? parseISO(child.birth) : null;

  const checkupsWithDate = useMemo(() => {
    if (!birth) return [];
    return CHECKUPS.map((c) => ({ checkup: c, dueDate: checkupDueDate(birth, c), dueIso: toISO(checkupDueDate(birth, c)) }));
  }, [birth]);

  const checkupsByDate = useMemo(() => {
    const map: Record<string, (typeof checkupsWithDate)[number][]> = {};
    for (const entry of checkupsWithDate) {
      const list = map[entry.dueIso] ?? [];
      list.push(entry);
      map[entry.dueIso] = list;
    }
    return map;
  }, [checkupsWithDate]);

  const upcomingCheckups = useMemo(
    () => checkupsWithDate.slice().sort((a, b) => (a.dueIso < b.dueIso ? -1 : 1)),
    [checkupsWithDate],
  );

  const load = useCallback(async () => {
    if (!child) return;
    setLoading(true);
    try {
      const [rows, doneRows] = await Promise.all([listPhotosForMonth(child.id, year, month), listDoneCheckups(child.id)]);
      setPhotos(rows);
      const signed = await getSignedUrls(rows.map((r) => r.storage_path));
      setUrls(signed);
      const doneMap: Record<string, CheckupDone> = {};
      for (const d of doneRows) doneMap[d.checkup_id] = d;
      setDoneCheckups(doneMap);
    } finally {
      setLoading(false);
    }
  }, [child, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCheckup = async (checkupId: string) => {
    if (!child) return;
    setCheckupBusyId(checkupId);
    try {
      if (doneCheckups[checkupId]) {
        await unmarkCheckupDone(child.id, checkupId);
      } else {
        await markCheckupDone(child.id, checkupId, toISO(today));
      }
      await load();
    } finally {
      setCheckupBusyId(null);
    }
  };

  const goMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  };

  if (!child) return null;

  const total = daysInMonth(year, month);
  const leadBlanks = firstWeekday(year, month);
  const cells: (number | null)[] = [...Array(leadBlanks).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  const todayIso = toISO(today);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goMonth(-1)} hitSlop={10}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {year}년 {month}월
        </Text>
        <TouchableOpacity onPress={() => goMonth(1)} hitSlop={10}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.collageToggle} onPress={() => setCollageMode((v) => !v)}>
        <Text style={styles.collageToggleText}>{collageMode ? '달력으로 보기' : '📷 사진 모아보기'}</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : collageMode ? (
        <ScrollView contentContainerStyle={styles.collageGrid}>
          {photos.length === 0 ? (
            <Text style={styles.empty}>이 달엔 아직 사진이 없어요.</Text>
          ) : (
            photos
              .slice()
              .sort((a, b) => (a.photo_date < b.photo_date ? -1 : 1))
              .map((p) => (
                <TouchableOpacity key={p.photo_date} style={styles.collageCell} onPress={() => setSelectedDate(p.photo_date)}>
                  {urls[p.storage_path] ? (
                    <Image source={{ uri: urls[p.storage_path] }} style={styles.collageImage} />
                  ) : (
                    <View style={[styles.collageImage, styles.imagePlaceholder]} />
                  )}
                  <Text style={styles.collageDate}>{Number(p.photo_date.slice(8, 10))}일</Text>
                </TouchableOpacity>
              ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekdayText}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((d, idx) => {
              if (d === null) return <View key={`b${idx}`} style={styles.dayCell} />;
              const iso = `${year}-${pad(month)}-${pad(d)}`;
              const photo = photoByDate[iso];
              const isToday = iso === todayIso;
              const hasCheckup = Boolean(checkupsByDate[iso]);
              return (
                <TouchableOpacity key={iso} style={styles.dayCell} onPress={() => setSelectedDate(iso)}>
                  <View style={{ width: '100%', flex: 1 }}>
                    {photo && urls[photo.storage_path] ? (
                      <Image source={{ uri: urls[photo.storage_path] }} style={styles.dayThumb} />
                    ) : (
                      <View style={[styles.dayThumb, styles.dayThumbEmpty]} />
                    )}
                    {hasCheckup ? <View style={styles.checkupDot} /> : null}
                  </View>
                  <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.checkupSection}>
            <Text style={styles.checkupSectionTitle}>검진 일정</Text>
            <Text style={styles.checkupSectionHint}>날짜를 눌러 완료 체크하세요. 해당 월 달력 칸에는 파란 점으로도 표시돼요.</Text>
            {upcomingCheckups.map(({ checkup, dueDate }) => {
              const isDone = Boolean(doneCheckups[checkup.id]);
              const isDue = !isDone && today >= dueDate;
              const statusLabel = isDone ? '완료' : isDue ? '검진할 때예요' : '예정';
              return (
                <TouchableOpacity
                  key={checkup.id}
                  style={styles.checkupRow}
                  onPress={() => toggleCheckup(checkup.id)}
                  disabled={checkupBusyId === checkup.id}
                >
                  <View style={[styles.checkupCheckbox, isDone && styles.checkupCheckboxDone]}>
                    {isDone ? <Text style={styles.checkupCheckboxMark}>✓</Text> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkupLabel}>{checkup.label}</Text>
                    <Text style={styles.checkupAge}>
                      {checkup.ageNote} · {dueDate.getFullYear()}년 {dueDate.getMonth() + 1}월 {dueDate.getDate()}일
                    </Text>
                  </View>
                  {checkupBusyId === checkup.id ? (
                    <ActivityIndicator size="small" color={colors.ink} />
                  ) : (
                    <Text style={[styles.checkupStatus, isDone && styles.checkupStatusDone, isDue && styles.checkupStatusDue]}>
                      {statusLabel}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {selectedDate ? (
        <DayDetailModal
          childId={child.id}
          date={selectedDate}
          photo={photoByDate[selectedDate] ?? null}
          photoUrl={photoByDate[selectedDate] ? urls[photoByDate[selectedDate].storage_path] : undefined}
          onClose={() => setSelectedDate(null)}
          onChanged={load}
          colors={colors}
          styles={styles}
        />
      ) : null}
    </View>
  );
}

function DayDetailModal({
  childId,
  date,
  photo,
  photoUrl,
  onClose,
  onChanged,
  colors,
  styles,
}: {
  childId: string;
  date: string;
  photo: PhotoEntry | null;
  photoUrl?: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listRecordsForDate(childId, date)
      .then(setRecords)
      .finally(() => setLoadingRecords(false));
  }, [childId, date]);

  const pickAndUpload = async () => {
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
    setBusy(true);
    try {
      await uploadPhotoForDate(childId, date, result.assets[0].base64);
      await onChanged();
    } catch (e) {
      Alert.alert('업로드 실패', e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    setBusy(true);
    try {
      await deletePhotoForDate(childId, date);
      await onChanged();
    } catch (e) {
      Alert.alert('삭제 실패', e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {Number(date.slice(5, 7))}월 {Number(date.slice(8, 10))}일
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={styles.modalClose}>닫기</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            {photo && photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.modalPhoto} />
            ) : (
              <View style={[styles.modalPhoto, styles.imagePlaceholder]}>
                <Text style={styles.empty}>아직 사진이 없어요</Text>
              </View>
            )}

            {busy ? (
              <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.ink} />
            ) : (
              <View style={styles.modalPhotoActions}>
                <TouchableOpacity style={styles.modalBtn} onPress={pickAndUpload}>
                  <Text style={styles.modalBtnText}>{photo ? '사진 바꾸기' : '사진 추가하기'}</Text>
                </TouchableOpacity>
                {photo ? (
                  <TouchableOpacity style={[styles.modalBtn, styles.modalBtnDanger]} onPress={removePhoto}>
                    <Text style={[styles.modalBtnText, styles.modalBtnDangerText]}>삭제</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            <Text style={styles.modalSectionTitle}>이 날의 기록</Text>
            {loadingRecords ? (
              <ActivityIndicator color={colors.ink} />
            ) : records.length === 0 ? (
              <Text style={styles.empty}>기록이 없어요.</Text>
            ) : (
              records.map((r) => (
                <View key={r.id} style={styles.recordRow}>
                  <Text style={styles.recordTime}>{r.time}</Text>
                  <Text style={styles.recordLabel}>{TYPE_LABEL[r.type]}</Text>
                  {r.amount != null ? <Text style={styles.recordAmount}>{r.amount}</Text> : null}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.md },
    navArrow: { fontSize: 24, color: colors.inkSoft, fontWeight: '700', paddingHorizontal: spacing.md },
    title: { fontSize: 18, fontWeight: '800', color: colors.ink },
    collageToggle: { alignSelf: 'flex-end', marginBottom: spacing.md },
    collageToggleText: { fontSize: 12.5, fontWeight: '700', color: colors.accent },
    weekdayRow: { flexDirection: 'row' },
    weekdayText: { flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: '700', color: colors.inkFaint, marginBottom: spacing.xs },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 0.8, alignItems: 'center', padding: 3 },
    dayThumb: { width: '100%', flex: 1, borderRadius: radius.sm },
    dayThumbEmpty: { backgroundColor: colors.line },
    checkupDot: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.skyDeep,
      borderWidth: 1,
      borderColor: colors.card,
    },
    dayNum: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
    dayNumToday: { color: colors.accent, fontWeight: '800' },
    checkupSection: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    checkupSectionTitle: { fontSize: 13.5, fontWeight: '800', color: colors.ink, paddingHorizontal: spacing.xs },
    checkupSectionHint: { fontSize: 11, color: colors.inkFaint, marginTop: 2, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
    checkupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    checkupCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkupCheckboxDone: { backgroundColor: colors.mintDeep, borderColor: colors.mintDeep },
    checkupCheckboxMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
    checkupLabel: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
    checkupAge: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
    checkupStatus: { fontSize: 11.5, fontWeight: '700', color: colors.inkFaint },
    checkupStatusDone: { color: colors.mintDeep },
    checkupStatusDue: { color: colors.accent },
    empty: { textAlign: 'center', color: colors.inkFaint, fontSize: 12.5, marginTop: spacing.xl },
    collageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.xl },
    collageCell: { width: '31%', alignItems: 'center' },
    collageImage: { width: '100%', aspectRatio: 1, borderRadius: radius.md },
    collageDate: { fontSize: 11, color: colors.inkSoft, marginTop: 4 },
    imagePlaceholder: { backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      maxHeight: '85%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
    modalClose: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
    modalPhoto: { width: '100%', aspectRatio: 1, borderRadius: radius.lg },
    modalPhotoActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    modalBtn: { flex: 1, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
    modalBtnText: { color: colors.bg, fontSize: 13, fontWeight: '700' },
    modalBtnDanger: { backgroundColor: colors.peach },
    modalBtnDangerText: { color: colors.accentInk },
    modalSectionTitle: { fontSize: 14, fontWeight: '800', color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.sm },
    recordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    recordTime: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, width: 44 },
    recordLabel: { fontSize: 13, fontWeight: '600', color: colors.ink, flex: 1 },
    recordAmount: { fontSize: 12, color: colors.inkSoft },
  });
}
