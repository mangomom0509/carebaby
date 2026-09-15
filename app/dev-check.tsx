import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { listDoneDevChecks, markDevCheckDone, unmarkDevCheckDone } from '../lib/api/dev-checks';
import { ageMonths, parseISO, todayStart } from '../lib/dates';
import { DEV_MILESTONES, DOMAIN_COLOR } from '../lib/dev-milestones';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';
import type { DevCheck } from '../lib/types';

export default function DevCheckScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [done, setDone] = useState<Record<string, DevCheck>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!child) return;
    const rows = await listDoneDevChecks(child.id);
    const map: Record<string, DevCheck> = {};
    for (const r of rows) map[r.milestone_id] = r;
    setDone(map);
    setLoading(false);
  }, [child]);

  useEffect(() => {
    load();
  }, [load]);

  const today = useMemo(() => todayStart(), []);
  const birth = child ? parseISO(child.birth) : null;
  const currentMonths = birth ? ageMonths(birth, today) : 0;

  const groups = useMemo(() => {
    const map = new Map<string, typeof DEV_MILESTONES>();
    for (const m of DEV_MILESTONES) {
      const list = map.get(m.ageGroup) ?? [];
      list.push(m);
      map.set(m.ageGroup, list);
    }
    return Array.from(map.entries());
  }, []);

  const toggle = async (milestoneId: string) => {
    if (!child) return;
    setBusyId(milestoneId);
    try {
      if (done[milestoneId]) {
        await unmarkDevCheckDone(child.id, milestoneId);
      } else {
        await markDevCheckDone(child.id, milestoneId);
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (!child || !birth) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>발달 체크</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          대근육 항목은 WHO 운동발달 기준, 나머지는 일반적인 발달 체크리스트를 참고한 안내예요. 정확한 평가는 영유아 건강검진에서
          확인해주세요.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
          {groups.map(([ageGroup, milestones]) => {
            const isCurrentOrPast = currentMonths >= milestones[0].ageMonths;
            return (
              <View key={ageGroup} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{ageGroup}</Text>
                  {!isCurrentOrPast ? <Text style={styles.groupHint}>아직이에요</Text> : null}
                </View>
                {milestones.map((m) => {
                  const isDone = Boolean(done[m.id]);
                  const isDue = !isDone && currentMonths >= m.ageMonths;
                  const statusLabel = isDone ? '완료' : isDue ? '확인해보세요' : '예정';
                  const statusStyle = isDone ? styles.badgeDone : isDue ? styles.badgeDue : styles.badgeUpcoming;
                  const statusTextStyle = isDone ? styles.badgeDoneText : isDue ? styles.badgeDueText : styles.badgeUpcomingText;
                  return (
                    <TouchableOpacity key={m.id} style={styles.doseRow} onPress={() => toggle(m.id)} disabled={busyId === m.id}>
                      <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                        {isDone ? <Text style={styles.checkboxMark}>✓</Text> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.domainRow}>
                          <View style={[styles.domainDot, { backgroundColor: DOMAIN_COLOR[m.domain] }]} />
                          <Text style={styles.domainLabel}>{m.domain}</Text>
                        </View>
                        <Text style={styles.doseName}>{m.label}</Text>
                        <Text style={styles.doseAge}>{m.windowNote}</Text>
                      </View>
                      {busyId === m.id ? (
                        <ActivityIndicator size="small" color={colors.ink} />
                      ) : (
                        <View style={[styles.badge, statusStyle]}>
                          <Text style={[styles.badgeText, statusTextStyle]}>{statusLabel}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    back: { fontSize: 14, color: colors.inkSoft, fontWeight: '600', width: 40 },
    title: { fontSize: 17, fontWeight: '800', color: colors.ink },
    disclaimer: { backgroundColor: colors.butter, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
    disclaimerText: { fontSize: 11.5, color: colors.butterDeep, lineHeight: 16 },
    groupCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
    groupTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
    groupHint: { fontSize: 11, color: colors.inkFaint, fontWeight: '600' },
    doseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: colors.mintDeep, borderColor: colors.mintDeep },
    checkboxMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
    domainRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    domainDot: { width: 7, height: 7, borderRadius: 4 },
    domainLabel: { fontSize: 10.5, fontWeight: '700', color: colors.inkSoft },
    doseName: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
    doseAge: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
    badgeText: { fontSize: 11, fontWeight: '700' },
    badgeDone: { backgroundColor: colors.mint },
    badgeDoneText: { color: colors.mintDeep },
    badgeDue: { backgroundColor: colors.peach },
    badgeDueText: { color: colors.coral },
    badgeUpcoming: { backgroundColor: colors.bg },
    badgeUpcomingText: { color: colors.inkFaint },
  });
}
