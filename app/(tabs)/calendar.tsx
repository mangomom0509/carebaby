import { useCallback, useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { listDoneCheckups, markCheckupDone, unmarkCheckupDone } from '../../lib/api/checkups';
import { deletePhotoForDate, getSignedUrls, listPhotosForMonth, uploadPhotoForDate } from '../../lib/api/photos';
import { listRecordsForDate } from '../../lib/api/records';
import { listDoneVaccines, markVaccineDone, unmarkVaccineDone } from '../../lib/api/vaccines';
import { checkupDueDate, CHECKUPS } from '../../lib/checkups';
import { pad, parseISO, toISO, todayStart } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { useTheme } from '../../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../../lib/theme';
import { vaccineDueDate, VACCINE_DOSES } from '../../lib/vaccines';
import type { CheckupDone, PhotoEntry, RecordEntry, VaccineDose } from '../../lib/types';

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

function fmtMDwd(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
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
  const [doneVaccineIds, setDoneVaccineIds] = useState<Set<string>>(new Set());
  const [doneCheckupIds, setDoneCheckupIds] = useState<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const photoByDate = useMemo(() => {
    const map: Record<string, PhotoEntry> = {};
    for (const p of photos) map[p.photo_date] = p;
    return map;
  }, [photos]);

  const birth = child ? parseISO(child.birth) : null;

  const vaxWithDate = useMemo(() => {
    if (!birth) return [];
    return VACCINE_DOSES.map((dose) => {
      const dueDate = vaccineDueDate(birth, dose);
      return { dose, dueDate, dueIso: toISO(dueDate) };
    });
  }, [birth]);

  const chkWithDate = useMemo(() => {
    if (!birth) return [];
    return CHECKUPS.map((checkup) => {
      const dueDate = checkupDueDate(birth, checkup);
      return { checkup, dueDate, dueIso: toISO(dueDate) };
    });
  }, [birth]);

  const byDate = useMemo(() => {
    const map: Record<string, { vax: typeof vaxWithDate; chk: typeof chkWithDate }> = {};
    for (const v of vaxWithDate) {
      const entry = map[v.dueIso] ?? { vax: [], chk: [] };
      entry.vax.push(v);
      map[v.dueIso] = entry;
    }
    for (const c of chkWithDate) {
      const entry = map[c.dueIso] ?? { vax: [], chk: [] };
      entry.chk.push(c);
      map[c.dueIso] = entry;
    }
    return map;
  }, [vaxWithDate, chkWithDate]);

  const load = useCallback(async () => {
    if (!child) return;
    setLoading(true);
    try {
      const [rows, doneVax, doneChk] = await Promise.all([
        listPhotosForMonth(child.id, year, month),
        listDoneVaccines(child.id),
        listDoneCheckups(child.id),
      ]);
      setPhotos(rows);
      const signed = await getSignedUrls(rows.map((r) => r.storage_path));
      setUrls(signed);
      setDoneVaccineIds(new Set(doneVax.map((v: VaccineDose) => v.vaccine_id)));
      setDoneCheckupIds(new Set(doneChk.map((c: CheckupDone) => c.checkup_id)));
    } finally {
      setLoading(false);
    }
  }, [child, year, month]);

  useEffect(() => {
    load();
  }, [load]);

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
          <Icon name="chevL" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {year}년 {month}월
        </Text>
        <TouchableOpacity onPress={() => goMonth(1)} hitSlop={10}>
          <Icon name="chevR" size={18} color={colors.ink} />
        </TouchableOpacity>
      </View>

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
                <TouchableOpacity
                  key={p.photo_date}
                  style={styles.collageCell}
                  onPress={() => urls[p.storage_path] && setLightboxUrl(urls[p.storage_path])}
                >
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
              const dayEntry = byDate[iso];
              const hasVax = Boolean(dayEntry?.vax.length);
              const hasChk = Boolean(dayEntry?.chk.length);
              return (
                <TouchableOpacity key={iso} style={styles.dayCell} onPress={() => setSelectedDate(iso)}>
                  <View style={{ width: '100%', flex: 1 }}>
                    {photo && urls[photo.storage_path] ? (
                      <Image source={{ uri: urls[photo.storage_path] }} style={styles.dayThumb} />
                    ) : (
                      <View style={[styles.dayThumb, styles.dayThumbEmpty]} />
                    )}
                    {hasVax || hasChk ? (
                      <View style={styles.calDots}>
                        {hasVax ? <View style={[styles.calDot, { backgroundColor: colors.skyDeep }]} /> : null}
                        {hasChk ? <View style={[styles.calDot, { backgroundColor: colors.mintDeep }]} /> : null}
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.skyDeep }]} />
              <Text style={styles.legendText}>예방접종</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.mintDeep }]} />
              <Text style={styles.legendText}>영유아 검진</Text>
            </View>
            <TouchableOpacity style={styles.legendGalleryBtn} onPress={() => setCollageMode(true)}>
              <Text style={styles.histLink}>사진 모아보기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {collageMode ? (
        <TouchableOpacity style={styles.backToCalBtn} onPress={() => setCollageMode(false)}>
          <Text style={styles.histLink}>달력으로 보기</Text>
        </TouchableOpacity>
      ) : null}

      {selectedDate ? (
        <DayDetailModal
          childId={child.id}
          date={selectedDate}
          photo={photoByDate[selectedDate] ?? null}
          photoUrl={photoByDate[selectedDate] ? urls[photoByDate[selectedDate].storage_path] : undefined}
          vaxItems={byDate[selectedDate]?.vax ?? []}
          chkItems={byDate[selectedDate]?.chk ?? []}
          doneVaccineIds={doneVaccineIds}
          doneCheckupIds={doneCheckupIds}
          onClose={() => setSelectedDate(null)}
          onChanged={load}
          onViewPhoto={(url) => setLightboxUrl(url)}
          colors={colors}
          styles={styles}
        />
      ) : null}

      {lightboxUrl ? (
        <Modal animationType="fade" transparent onRequestClose={() => setLightboxUrl(null)}>
          <TouchableOpacity style={styles.lightboxOverlay} activeOpacity={1} onPress={() => setLightboxUrl(null)}>
            <Image source={{ uri: lightboxUrl }} style={styles.lightboxImage} resizeMode="contain" />
            <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUrl(null)}>
              <Icon name="x" size={18} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
}

function DayDetailModal({
  childId,
  date,
  photo,
  photoUrl,
  vaxItems,
  chkItems,
  doneVaccineIds,
  doneCheckupIds,
  onClose,
  onChanged,
  onViewPhoto,
  colors,
  styles,
}: {
  childId: string;
  date: string;
  photo: PhotoEntry | null;
  photoUrl?: string;
  vaxItems: { dose: (typeof VACCINE_DOSES)[number]; dueDate: Date }[];
  chkItems: { checkup: (typeof CHECKUPS)[number]; dueDate: Date }[];
  doneVaccineIds: Set<string>;
  doneCheckupIds: Set<string>;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onViewPhoto: (url: string) => void;
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listRecordsForDate(childId, date)
      .then(setRecords)
      .finally(() => setLoadingRecords(false));
  }, [childId, date]);

  const pendingVaxCount = vaxItems.filter((v) => !doneVaccineIds.has(v.dose.id)).length;

  const toggleVax = async (doseId: string) => {
    setBusyId(doseId);
    try {
      if (doneVaccineIds.has(doseId)) await unmarkVaccineDone(childId, doseId);
      else await markVaccineDone(childId, doseId, date);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };
  const toggleChk = async (checkupId: string) => {
    setBusyId(checkupId);
    try {
      if (doneCheckupIds.has(checkupId)) await unmarkCheckupDone(childId, checkupId);
      else await markCheckupDone(childId, checkupId, date);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

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
              {fmtMDwd(parseISO(date))}
              {pendingVaxCount > 1 ? ` · 예방접종 ${pendingVaxCount}건 동시 진행` : ''}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={styles.modalClose}>닫기</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            {photo && photoUrl ? (
              <TouchableOpacity onPress={() => onViewPhoto(photoUrl)}>
                <Image source={{ uri: photoUrl }} style={styles.modalPhoto} />
              </TouchableOpacity>
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
                  <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={removePhoto}>
                    <Text style={[styles.modalBtnText, styles.modalBtnGhostText]}>삭제</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {vaxItems.length > 0 || chkItems.length > 0 ? (
              <>
                <Text style={styles.modalSectionTitle}>이 날의 접종·검진</Text>
                {vaxItems.map(({ dose }) => {
                  const done = doneVaccineIds.has(dose.id);
                  return (
                    <View key={dose.id} style={styles.dayItem}>
                      <View style={styles.diLeft}>
                        <View style={[styles.iconDot, { backgroundColor: colors.sky }]}>
                          <Icon name="shot" size={14} color={colors.skyDeep} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.diName}>
                            {dose.vaccineName} {dose.doseLabel}
                          </Text>
                          <Text style={styles.diSub}>{done ? '접종 완료' : '예정일'}</Text>
                        </View>
                      </View>
                      {busyId === dose.id ? (
                        <ActivityIndicator size="small" color={colors.ink} />
                      ) : (
                        <TouchableOpacity style={styles.diBtn} onPress={() => toggleVax(dose.id)}>
                          <Text style={styles.diBtnText}>{done ? '취소' : '접종 완료 처리'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                {chkItems.map(({ checkup }) => {
                  const done = doneCheckupIds.has(checkup.id);
                  return (
                    <View key={checkup.id} style={styles.dayItem}>
                      <View style={styles.diLeft}>
                        <View style={[styles.iconDot, { backgroundColor: colors.mint }]}>
                          <Icon name="check" size={13} color={colors.mintDeep} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.diName}>{checkup.label}</Text>
                          <Text style={styles.diSub}>권장 시기 · {checkup.ageNote}</Text>
                        </View>
                      </View>
                      {busyId === checkup.id ? (
                        <ActivityIndicator size="small" color={colors.ink} />
                      ) : done ? (
                        <Icon name="check" size={16} color={colors.mintDeep} />
                      ) : (
                        <TouchableOpacity style={styles.diBtn} onPress={() => toggleChk(checkup.id)}>
                          <Text style={styles.diBtnText}>완료 표시</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </>
            ) : null}

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
    title: { fontSize: 18, fontWeight: '800', color: colors.ink },
    weekdayRow: { flexDirection: 'row' },
    weekdayText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.inkFaint, marginBottom: spacing.xs },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', padding: 3 },
    dayThumb: { width: '100%', flex: 1, borderRadius: radius.md },
    dayThumbEmpty: { backgroundColor: colors.line },
    calDots: { position: 'absolute', bottom: 3, right: 3, flexDirection: 'row', gap: 2 },
    calDot: { width: 5, height: 5, borderRadius: 2.5 },
    dayNum: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
    dayNumToday: { color: colors.accentOn, fontWeight: '800', backgroundColor: colors.accent, width: 20, height: 20, borderRadius: 10, textAlign: 'center', lineHeight: 20, overflow: 'hidden' },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14, marginBottom: 18, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: colors.inkSoft },
    legendGalleryBtn: { marginLeft: 'auto' },
    histLink: { fontSize: 11.5, fontWeight: '700', color: colors.accent },
    backToCalBtn: { alignSelf: 'flex-start', marginTop: spacing.md },
    empty: { textAlign: 'center', color: colors.inkFaint, fontSize: 12.5, marginTop: spacing.xl },
    collageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.xl },
    collageCell: { width: '31%', alignItems: 'center' },
    collageImage: { width: '100%', aspectRatio: 1, borderRadius: radius.md },
    collageDate: { fontSize: 11, color: colors.inkSoft, marginTop: 4 },
    imagePlaceholder: { backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,20,25,0.4)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: spacing.lg,
      maxHeight: '88%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
    modalTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, flex: 1 },
    modalClose: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
    modalPhoto: { width: '100%', aspectRatio: 1.4, borderRadius: radius.lg },
    modalPhotoActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    modalBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
    modalBtnText: { color: colors.accentOn, fontSize: 13, fontWeight: '700' },
    modalBtnGhost: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line },
    modalBtnGhostText: { color: colors.ink },
    modalSectionTitle: { fontSize: 14, fontWeight: '800', color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.sm },
    dayItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line },
    diLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
    iconDot: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    diName: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
    diSub: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
    diBtn: { borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9 },
    diBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.ink },
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
    lightboxOverlay: { flex: 1, backgroundColor: 'rgba(20,20,25,0.9)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    lightboxImage: { width: '100%', height: '100%' },
    lightboxClose: {
      position: 'absolute',
      top: 50,
      right: 20,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
