import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { ageMonths, parseISO, todayStart } from '../lib/dates';
import { Icon } from '../lib/icons';
import { bandForAgeMonths, sleepGuideForBand, SLEEP_BANDS, type SleepBand } from '../lib/sleep-guide';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';

export default function SleepGuideScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [band, setBand] = useState<SleepBand>('0-3');
  const [bandInitialized, setBandInitialized] = useState(false);

  useEffect(() => {
    if (child && !bandInitialized) {
      const months = ageMonths(parseISO(child.birth), todayStart());
      setBand(bandForAgeMonths(months));
      setBandInitialized(true);
    }
  }, [child, bandInitialized]);

  if (!child) return null;

  const currentBand = bandForAgeMonths(ageMonths(parseISO(child.birth), todayStart()));
  const guide = sleepGuideForBand(band);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Icon name="chevL" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>월령별 수면 가이드</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          이 정보는 일반적인 참고용이며 진단이나 처방이 아니에요. 아이 상태가 걱정되면 소아과 전문의와 상담하세요.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bandRow} contentContainerStyle={{ gap: spacing.sm }}>
        {SLEEP_BANDS.map((b) => (
          <TouchableOpacity key={b.id} style={[styles.bandChip, band === b.id && styles.bandChipActive]} onPress={() => setBand(b.id)}>
            <Text style={[styles.bandChipText, band === b.id && styles.bandChipTextActive]}>{b.label}</Text>
            {b.id === currentBand ? <View style={styles.bandChipDot} /> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
        {guide ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>수면 패턴</Text>
              {!guide.reviewed ? (
                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>검수 전</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.metaLabel}>하루 총 수면시간</Text>
            <Text style={styles.metaText}>{guide.totalSleepHours}</Text>

            <Text style={styles.metaLabel}>낮잠</Text>
            <Text style={styles.metaText}>{guide.napInfo}</Text>

            {guide.notes.map((n, i) => (
              <Text key={i} style={styles.noteText}>
                ·  {n}
              </Text>
            ))}

            <View style={styles.safetyCard}>
              <Text style={styles.safetyTitle}>꼭 지켜야 할 안전 수면 수칙</Text>
              {guide.safeSleepTips.map((t, i) => (
                <Text key={i} style={styles.safetyText}>
                  ·  {t}
                </Text>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>수면 패턴은 아이마다 차이가 커요. 이 범위를 벗어난다고 문제인 건 아니에요.</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    backBtn: { width: 28 },
    title: { fontSize: 17, fontWeight: '800', color: colors.ink },
    disclaimer: { backgroundColor: colors.peach, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
    disclaimerText: { fontSize: 11.5, color: colors.accentInk, lineHeight: 16 },
    bandRow: { flexGrow: 0, marginBottom: spacing.md },
    bandChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    bandChipActive: { borderColor: colors.accent, backgroundColor: colors.accent },
    bandChipText: { fontSize: 13, fontWeight: '700', color: colors.inkSoft },
    bandChipTextActive: { color: colors.accentOn },
    bandChipDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.peachDeep },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.lg,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
    reviewBadge: { backgroundColor: colors.warnBg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
    reviewBadgeText: { fontSize: 10.5, fontWeight: '800', color: colors.warnInk },
    metaLabel: { fontSize: 11, fontWeight: '800', color: colors.inkSoft, marginTop: 10, marginBottom: 2 },
    metaText: { fontSize: 14, fontWeight: '700', color: colors.ink },
    noteText: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 19, marginTop: 6 },
    safetyCard: { backgroundColor: colors.feverBg, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
    safetyTitle: { fontSize: 13, fontWeight: '800', color: colors.feverInk, marginBottom: 6 },
    safetyText: { fontSize: 12.5, color: colors.feverInk, lineHeight: 19 },
    footer: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
    footerText: { fontSize: 11, color: colors.inkFaint, lineHeight: 16, textAlign: 'center' },
  });
}
