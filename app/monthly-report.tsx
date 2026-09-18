import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { getSignedUrls } from '../lib/api/photos';
import { todayStart } from '../lib/dates';
import { Icon } from '../lib/icons';
import { buildMonthlyReport, formatShortDate, type MonthlyReportData } from '../lib/monthly-report';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

function fmtMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

function growthParagraph(data: MonthlyReportData): string | null {
  const { latest, previous, weightPct } = data.growth;
  if (!latest) return null;
  const parts: string[] = [];
  if (latest.weight_kg != null) {
    let s = `몸무게는 ${latest.weight_kg}kg`;
    if (previous?.weight_kg != null) s += ` (지난번보다 +${(latest.weight_kg - previous.weight_kg).toFixed(1)}kg)`;
    parts.push(s);
  }
  if (latest.height_cm != null) {
    let s = `키는 ${latest.height_cm}cm`;
    if (previous?.height_cm != null) s += ` (+${(latest.height_cm - previous.height_cm).toFixed(1)}cm)`;
    parts.push(s);
  }
  if (latest.head_circumference_cm != null) parts.push(`머리둘레는 ${latest.head_circumference_cm}cm`);
  if (parts.length === 0) return null;
  let sentence = parts.join(', ') + '였어요.';
  if (weightPct) sentence += ` 또래 100명 중 ${weightPct.percentile}번째로 튼튼하게 크고 있어요.`;
  return sentence;
}

function feedingParagraph(data: MonthlyReportData): string | null {
  const { feedCount, feedAvgAmount, mealCount, snackCount } = data.feeding;
  if (!feedCount && !mealCount && !snackCount) return null;
  const parts: string[] = [];
  if (feedCount) parts.push(`하루 평균 ${feedAvgAmount}ml씩 총 ${feedCount}번 수유`);
  if (mealCount) parts.push(`이유식 ${mealCount}번`);
  if (snackCount) parts.push(`간식 ${snackCount}번`);
  return parts.join(', ') + ' 먹었어요.';
}

function sleepParagraph(data: MonthlyReportData): string | null {
  if (data.sleep.avgDailyMinutes == null) return null;
  return `하루 평균 ${fmtMinutes(data.sleep.avgDailyMinutes)} 잤어요.`;
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

  if (!child) return null;

  const otherPhotos = report
    ? report.photos
        .slice()
        .sort((a, b) => (a.photo_date < b.photo_date ? -1 : 1))
        .slice(0, -1)
        .slice(0, 4)
    : [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Icon name="chevL" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>이달의 이야기</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading || !report ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
          <View style={styles.page}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => goMonth(-1)} hitSlop={10}>
                <Icon name="chevL" size={15} color={colors.inkSoft} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {year}년 {month}월
              </Text>
              <TouchableOpacity onPress={() => goMonth(1)} hitSlop={10}>
                <Icon name="chevR" size={15} color={colors.inkSoft} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pageTitle}>
              {report.ageMonthsAtEnd}개월, {child.name}의 기록
            </Text>

            {photoUrl ? (
              <>
                <Image source={{ uri: photoUrl }} style={styles.mainPhoto} />
                <Text style={styles.photoCaption}>
                  {year}년 {month}월의 {child.name}
                </Text>
              </>
            ) : null}

            {otherPhotos.length > 0 ? (
              <View style={styles.filmRow}>
                {otherPhotos.map((p, i) => (
                  <Image
                    key={p.photo_date}
                    source={{ uri: collageUrls[p.storage_path] }}
                    style={[styles.filmThumb, { transform: [{ rotate: `${i % 2 === 0 ? -3 : 3}deg` }] }]}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.divider} />

            {growthParagraph(report) ? <Text style={styles.paragraph}>{growthParagraph(report)}</Text> : null}
            {feedingParagraph(report) ? <Text style={styles.paragraph}>{feedingParagraph(report)}</Text> : null}
            {sleepParagraph(report) ? <Text style={styles.paragraph}>{sleepParagraph(report)}</Text> : null}

            {report.devChecksThisMonth.length > 0 ? (
              <View style={styles.listBlock}>
                <Text style={styles.listTitle}>이번 달 새로 해낸 것</Text>
                {report.devChecksThisMonth.map(({ milestone, doneAt }) => (
                  <View key={milestone.id} style={styles.listRow}>
                    <Text style={styles.listItem}>·  {milestone.label}</Text>
                    <Text style={styles.listDate}>{formatShortDate(doneAt)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {report.vaccinesThisMonth.length > 0 || report.checkupsThisMonth.length > 0 ? (
              <View style={styles.listBlock}>
                <Text style={styles.listTitle}>이번 달 다녀온 병원</Text>
                {report.vaccinesThisMonth.map(({ dose, actualDate }) => (
                  <View key={dose.id} style={styles.listRow}>
                    <Text style={styles.listItem}>
                      ·  {dose.vaccineName} {dose.doseLabel}
                    </Text>
                    <Text style={styles.listDate}>{formatShortDate(actualDate)}</Text>
                  </View>
                ))}
                {report.checkupsThisMonth.map(({ checkup, doneAt }) => (
                  <View key={checkup.id} style={styles.listRow}>
                    <Text style={styles.listItem}>·  {checkup.label}</Text>
                    <Text style={styles.listDate}>{formatShortDate(doneAt)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.noteBlock}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="이번 달 우리 아이는 이랬어요..."
                placeholderTextColor={colors.inkFaint}
                multiline
              />
            </View>

            <Text style={styles.pageFooter}>{child.name}의 이야기 · {report.ageMonthsAtEnd}번째 달</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    backBtn: { width: 28 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
    page: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.lg },
    monthLabel: { fontSize: 11.5, fontWeight: '700', color: colors.inkFaint, letterSpacing: 0.5 },
    pageTitle: { fontFamily: SERIF, fontSize: 22, color: colors.ink, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 30 },
    mainPhoto: { width: '100%', aspectRatio: 1.15, borderRadius: radius.md },
    photoCaption: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: 8 },
    filmRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: spacing.lg, paddingHorizontal: spacing.sm },
    filmThumb: {
      width: 56,
      height: 56,
      borderRadius: 4,
      borderWidth: 3,
      borderColor: colors.card,
      backgroundColor: colors.line,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.xl },
    paragraph: { fontSize: 14.5, color: colors.ink, lineHeight: 24, marginBottom: spacing.md },
    listBlock: { marginTop: spacing.sm, marginBottom: spacing.lg },
    listTitle: { fontSize: 12, fontWeight: '800', color: colors.accentInk, marginBottom: 8, letterSpacing: 0.3 },
    listRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
    listItem: { fontSize: 13.5, color: colors.ink, lineHeight: 22, flex: 1 },
    listDate: { fontSize: 11.5, color: colors.inkFaint },
    noteBlock: { borderLeftWidth: 2, borderLeftColor: colors.peachDeep, paddingLeft: spacing.md, marginTop: spacing.md },
    noteInput: {
      fontFamily: SERIF,
      fontStyle: 'italic',
      fontSize: 14,
      color: colors.inkSoft,
      lineHeight: 22,
      minHeight: 50,
      textAlignVertical: 'top',
      padding: 0,
    },
    pageFooter: { fontSize: 10.5, color: colors.inkFaint, textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.5 },
  });
}
