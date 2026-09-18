import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import { useAuth } from '../lib/auth-context';
import { getSignedUrls } from '../lib/api/photos';
import { todayStart } from '../lib/dates';
import { Icon } from '../lib/icons';
import { buildMonthlyReport, daysInMonth, type MonthlyReportData } from '../lib/monthly-report';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';

function fmtMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

export default function MonthlyReportScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = useMemo(() => todayStart(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [collageUrls, setCollageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [sharing, setSharing] = useState(false);
  const shotRef = useRef<ViewShotRef>(null);

  const load = useCallback(async () => {
    if (!child) return;
    setLoading(true);
    try {
      const data = await buildMonthlyReport(child, year, month);
      setReport(data);
      const sortedPhotos = data.photos.slice().sort((a, b) => (a.photo_date < b.photo_date ? -1 : 1));
      const paths = sortedPhotos.map((p) => p.storage_path);
      const urls = paths.length ? await getSignedUrls(paths) : {};
      setCollageUrls(urls);
      const repPhoto = sortedPhotos[sortedPhotos.length - 1];
      setPhotoUrl(repPhoto ? urls[repPhoto.storage_path] : undefined);
    } finally {
      setLoading(false);
    }
  }, [child, year, month]);

  useEffect(() => {
    load();
    setNote('');
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

  const share = async () => {
    if (!shotRef.current) return;
    setSharing(true);
    try {
      const uri = await shotRef.current.capture();
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('공유할 수 없어요', '이 기기에서는 공유 기능을 사용할 수 없어요.');
      }
    } catch (e) {
      Alert.alert('공유 실패', e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
    } finally {
      setSharing(false);
    }
  };

  if (!child) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Icon name="chevL" size={18} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => goMonth(-1)} hitSlop={10}>
            <Icon name="chevL" size={16} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {year}년 {month}월
          </Text>
          <TouchableOpacity onPress={() => goMonth(1)} hitSlop={10}>
            <Icon name="chevR" size={16} color={colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {loading || !report ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
          <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.95 }} style={styles.card}>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>토닥</Text>
            </View>
            <Text style={styles.cardTitle}>
              {report.ageMonthsAtEnd}개월 성장보고서
            </Text>
            <Text style={styles.cardSubtitle}>
              {child.name} · {year}.{String(month).padStart(2, '0')}
            </Text>

            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.repPhoto} />
            ) : (
              <View style={[styles.repPhoto, styles.repPhotoEmpty]}>
                <Text style={styles.emptyText}>이 달에 등록된 사진이 없어요</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>신체 정보</Text>
            <View style={styles.statBlock}>
              <StatRow
                label="몸무게"
                value={report.growth.latest?.weight_kg != null ? `${report.growth.latest.weight_kg}kg` : '기록 없음'}
                delta={
                  report.growth.previous?.weight_kg != null && report.growth.latest?.weight_kg != null
                    ? `+${(report.growth.latest.weight_kg - report.growth.previous.weight_kg).toFixed(1)}kg`
                    : null
                }
                pct={report.growth.weightPct?.percentile}
                colors={colors}
                styles={styles}
              />
              <StatRow
                label="키"
                value={report.growth.latest?.height_cm != null ? `${report.growth.latest.height_cm}cm` : '기록 없음'}
                delta={
                  report.growth.previous?.height_cm != null && report.growth.latest?.height_cm != null
                    ? `+${(report.growth.latest.height_cm - report.growth.previous.height_cm).toFixed(1)}cm`
                    : null
                }
                pct={report.growth.heightPct?.percentile}
                colors={colors}
                styles={styles}
              />
              <StatRow
                label="머리둘레"
                value={report.growth.latest?.head_circumference_cm != null ? `${report.growth.latest.head_circumference_cm}cm` : '기록 없음'}
                delta={null}
                pct={report.growth.headPct?.percentile}
                colors={colors}
                styles={styles}
              />
            </View>

            <Text style={styles.sectionLabel}>수유·이유식</Text>
            <View style={styles.chipRow}>
              <Text style={styles.infoChip}>
                {report.feeding.feedCount > 0 ? `수유 평균 ${report.feeding.feedAvgAmount}ml · ${report.feeding.feedCount}회` : '수유 기록 없음'}
              </Text>
              {report.feeding.mealCount > 0 ? <Text style={styles.infoChip}>이유식 {report.feeding.mealCount}회</Text> : null}
              {report.feeding.snackCount > 0 ? <Text style={styles.infoChip}>간식 {report.feeding.snackCount}회</Text> : null}
            </View>

            <Text style={styles.sectionLabel}>수면</Text>
            <Text style={styles.infoChip}>
              {report.sleep.avgDailyMinutes != null ? `하루 평균 ${fmtMinutes(report.sleep.avgDailyMinutes)}` : '타임라인 모드에서는 표시되지 않아요'}
            </Text>

            {report.devChecksThisMonth.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>이번 달 새로 해낸 것</Text>
                <View style={styles.chipRow}>
                  {report.devChecksThisMonth.map((m) => (
                    <Text key={m.id} style={styles.infoChip}>
                      {m.label}
                    </Text>
                  ))}
                </View>
              </>
            ) : null}

            {report.vaccinesThisMonth.length > 0 || report.checkupsThisMonth.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>이번 달 접종·검진</Text>
                <View style={styles.chipRow}>
                  {report.vaccinesThisMonth.map((v) => (
                    <Text key={v.id} style={styles.infoChip}>
                      {v.vaccineName} {v.doseLabel}
                    </Text>
                  ))}
                  {report.checkupsThisMonth.map((c) => (
                    <Text key={c.id} style={styles.infoChip}>
                      {c.label}
                    </Text>
                  ))}
                </View>
              </>
            ) : null}

            {report.photos.length > 1 ? (
              <>
                <Text style={styles.sectionLabel}>이번 달 사진 모음</Text>
                <View style={styles.collageRow}>
                  {report.photos
                    .slice()
                    .sort((a, b) => (a.photo_date < b.photo_date ? -1 : 1))
                    .slice(0, 6)
                    .map((p) =>
                      collageUrls[p.storage_path] ? (
                        <Image key={p.photo_date} source={{ uri: collageUrls[p.storage_path] }} style={styles.collageThumb} />
                      ) : null,
                    )}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionLabel}>특이 발달사항 / 한마디</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="이번 달 우리 아이는 이랬어요..."
              placeholderTextColor={colors.inkFaint}
              multiline
            />
          </ViewShot>

          <TouchableOpacity style={styles.shareBtn} onPress={share} disabled={sharing}>
            {sharing ? <ActivityIndicator color={colors.accentOn} /> : <Text style={styles.shareBtnText}>카드 공유하기</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function StatRow({
  label,
  value,
  delta,
  pct,
  colors,
  styles,
}: {
  label: string;
  value: string;
  delta: string | null;
  pct?: number;
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {delta ? <Text style={styles.statDelta}>{delta}</Text> : null}
      {pct != null ? <Text style={styles.statPct}>또래 100명 중 {pct}번째</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    backBtn: { width: 28 },
    monthNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    title: { fontSize: 16, fontWeight: '800', color: colors.ink },
    card: {
      backgroundColor: colors.peach,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    cardBadge: { alignSelf: 'flex-end', backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, marginBottom: spacing.sm },
    cardBadgeText: { fontSize: 11, fontWeight: '800', color: colors.accentInk },
    cardTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: spacing.xs },
    cardSubtitle: { fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: 4, marginBottom: spacing.md },
    repPhoto: { width: '100%', aspectRatio: 1.3, borderRadius: radius.lg, marginBottom: spacing.md },
    repPhotoEmpty: { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 12, color: colors.inkFaint },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.accentInk, marginTop: spacing.md, marginBottom: 8 },
    statBlock: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md },
    statRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 6 },
    statLabel: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, width: 56 },
    statValue: { fontSize: 15, fontWeight: '800', color: colors.ink },
    statDelta: { fontSize: 11.5, fontWeight: '700', color: colors.accentInk },
    statPct: { fontSize: 11, color: colors.inkSoft, marginLeft: 'auto' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoChip: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.accentInk,
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      paddingHorizontal: 11,
      paddingVertical: 6,
      overflow: 'hidden',
    },
    collageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    collageThumb: { width: '31%', aspectRatio: 1, borderRadius: radius.sm },
    noteInput: {
      minHeight: 56,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      padding: spacing.md,
      fontSize: 13,
      color: colors.ink,
      textAlignVertical: 'top',
    },
    shareBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
    shareBtnText: { color: colors.accentOn, fontSize: 15, fontWeight: '700' },
  });
}
