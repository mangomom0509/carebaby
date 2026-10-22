import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { logPlayToday, listPlayLogsForChild, unlogPlayToday } from '../lib/api/play-logs';
import { ageMonths, parseISO, toISO, todayStart } from '../lib/dates';
import { domainColor } from '../lib/dev-milestones';
import { Icon } from '../lib/icons';
import { bandForAgeMonths, playsForBand, PLAY_BANDS, type PlayBand } from '../lib/play-ideas';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';

function fmtDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function PlayIdeasScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const todayIso = useMemo(() => toISO(todayStart()), []);

  const [band, setBand] = useState<PlayBand>('0-3');
  const [bandInitialized, setBandInitialized] = useState(false);
  const [logsByPlay, setLogsByPlay] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!child) return;
    setLoading(true);
    try {
      const rows = await listPlayLogsForChild(child.id);
      const map: Record<string, string[]> = {};
      for (const r of rows) {
        (map[r.play_id] ??= []).push(r.played_date);
      }
      setLogsByPlay(map);
    } finally {
      setLoading(false);
    }
  }, [child]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (child && !bandInitialized) {
      const months = ageMonths(parseISO(child.birth), todayStart());
      setBand(bandForAgeMonths(months));
      setBandInitialized(true);
    }
  }, [child, bandInitialized]);

  const toggle = async (playId: string) => {
    if (!child) return;
    setBusyId(playId);
    try {
      const dates = logsByPlay[playId] ?? [];
      if (dates.includes(todayIso)) {
        await unlogPlayToday(child.id, playId, todayIso);
      } else {
        await logPlayToday(child.id, playId, todayIso);
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (!child) return null;

  const currentBand = bandForAgeMonths(ageMonths(parseISO(child.birth), todayStart()));
  const plays = playsForBand(band);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Icon name="chevL" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>월령별 놀이</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          월령에 맞춰 집에서 해볼 수 있는 놀이 아이디어예요. 교육·치료 프로그램이 아니라 참고용 활동 모음이에요.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bandRow} contentContainerStyle={{ gap: spacing.sm }}>
        {PLAY_BANDS.map((b) => (
          <TouchableOpacity key={b.id} style={[styles.bandChip, band === b.id && styles.bandChipActive]} onPress={() => setBand(b.id)}>
            <Text style={[styles.bandChipText, band === b.id && styles.bandChipTextActive]}>{b.label}</Text>
            {b.id === currentBand ? <View style={styles.bandChipDot} /> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
          {plays.map((play) => {
            const dates = logsByPlay[play.id] ?? [];
            const doneToday = dates.includes(todayIso);
            const recent = dates.slice(0, 3);
            return (
              <View key={play.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.playName}>{play.name}</Text>
                  {!play.reviewed ? (
                    <View style={styles.reviewBadge}>
                      <Text style={styles.reviewBadgeText}>검수 전</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.domainRow}>
                  {play.domains.map((d) => (
                    <View key={d} style={styles.domainChip}>
                      <View style={[styles.domainDot, { backgroundColor: domainColor(d, colors) }]} />
                      <Text style={styles.domainChipText}>{d}</Text>
                    </View>
                  ))}
                  <Text style={styles.durationText}>· {play.durationMinutes}</Text>
                </View>

                <Text style={styles.metaLabel}>준비물</Text>
                <Text style={styles.metaText}>{play.materials.join(', ')}</Text>

                <Text style={styles.metaLabel}>방법</Text>
                {play.steps.map((s, i) => (
                  <Text key={i} style={styles.stepText}>
                    ·  {s}
                  </Text>
                ))}

                <View style={styles.safetyBox}>
                  <Text style={styles.safetyText}>{play.safetyNote}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.doneBtn, doneToday && styles.doneBtnActive]}
                  onPress={() => toggle(play.id)}
                  disabled={busyId === play.id}
                >
                  {busyId === play.id ? (
                    <ActivityIndicator size="small" color={doneToday ? colors.accentOn : colors.ink} />
                  ) : (
                    <Text style={[styles.doneBtnText, doneToday && styles.doneBtnTextActive]}>
                      {doneToday ? '오늘 했어요 ✓' : '오늘 해봤어요'}
                    </Text>
                  )}
                </TouchableOpacity>
                {recent.length > 0 ? <Text style={styles.recentText}>최근 기록: {recent.map(fmtDate).join(', ')}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>발달 속도는 아이마다 달라요. 이 목록은 참고용 놀이 아이디어이고, 꼭 이 시기에 해야 하는 건 아니에요.</Text>
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
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: 8 },
    playName: { fontSize: 15, fontWeight: '800', color: colors.ink, flex: 1 },
    reviewBadge: { backgroundColor: colors.warnBg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
    reviewBadgeText: { fontSize: 10.5, fontWeight: '800', color: colors.warnInk },
    domainRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    domainChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    domainDot: { width: 7, height: 7, borderRadius: 3.5 },
    domainChipText: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },
    durationText: { fontSize: 11, color: colors.inkFaint },
    metaLabel: { fontSize: 11, fontWeight: '800', color: colors.inkSoft, marginTop: 6, marginBottom: 2 },
    metaText: { fontSize: 12.5, color: colors.ink, lineHeight: 18 },
    stepText: { fontSize: 12.5, color: colors.ink, lineHeight: 19 },
    safetyBox: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 10, marginTop: 10 },
    safetyText: { fontSize: 11.5, color: colors.inkSoft, lineHeight: 16 },
    doneBtn: {
      marginTop: 12,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      paddingVertical: 11,
      alignItems: 'center',
    },
    doneBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    doneBtnText: { fontSize: 13, fontWeight: '700', color: colors.ink },
    doneBtnTextActive: { color: colors.accentOn },
    recentText: { fontSize: 11, color: colors.inkFaint, marginTop: 6, textAlign: 'center' },
    footer: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
    footerText: { fontSize: 11, color: colors.inkFaint, lineHeight: 16, textAlign: 'center' },
  });
}
