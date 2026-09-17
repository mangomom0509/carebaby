import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { listDoneVaccines, markVaccineDone, unmarkVaccineDone } from '../lib/api/vaccines';
import { parseISO, toISO, todayStart } from '../lib/dates';
import { Icon } from '../lib/icons';
import { VACCINE_DOSES, vaccineDueDate } from '../lib/vaccines';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';
import type { VaccineDose } from '../lib/types';

export default function VaccinesScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [done, setDone] = useState<Record<string, VaccineDose>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!child) return;
    const rows = await listDoneVaccines(child.id);
    const map: Record<string, VaccineDose> = {};
    for (const r of rows) map[r.vaccine_id] = r;
    setDone(map);
    setLoading(false);
  }, [child]);

  useEffect(() => {
    load();
  }, [load]);

  const today = useMemo(() => todayStart(), []);
  const todayIso = useMemo(() => toISO(today), [today]);
  const birth = child ? parseISO(child.birth) : null;

  const groups = useMemo(() => {
    const map = new Map<string, typeof VACCINE_DOSES>();
    for (const dose of VACCINE_DOSES) {
      const list = map.get(dose.visitGroup) ?? [];
      list.push(dose);
      map.set(dose.visitGroup, list);
    }
    return Array.from(map.entries());
  }, []);

  const toggle = async (vaccineId: string) => {
    if (!child) return;
    setBusyId(vaccineId);
    try {
      if (done[vaccineId]) {
        await unmarkVaccineDone(child.id, vaccineId);
      } else {
        await markVaccineDone(child.id, vaccineId, todayIso);
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Icon name="chevL" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>예방접종</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          질병관리청 표준예방접종일정표 기준 참고용 일정이에요. 정확한 시기·간격은 소아과 상담으로 확인해주세요.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
          {groups.map(([visitGroup, doses]) => (
            <View key={visitGroup} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{visitGroup}</Text>
                {doses.length > 1 ? <Text style={styles.groupHint}>같이 맞는 접종이에요</Text> : null}
              </View>
              {doses.map((dose) => {
                const isDone = Boolean(done[dose.id]);
                const dueDate = vaccineDueDate(birth, dose);
                const isDue = !isDone && dueDate <= today;
                const statusLabel = isDone ? '완료' : isDue ? '접종할 때예요' : '예정';
                const statusStyle = isDone ? styles.badgeDone : isDue ? styles.badgeDue : styles.badgeUpcoming;
                const statusTextStyle = isDone ? styles.badgeDoneText : isDue ? styles.badgeDueText : styles.badgeUpcomingText;
                return (
                  <TouchableOpacity
                    key={dose.id}
                    style={styles.doseRow}
                    onPress={() => toggle(dose.id)}
                    disabled={busyId === dose.id}
                  >
                    <View style={[styles.iconDot, isDone && styles.iconDotDone]}>
                      <Icon name={isDone ? 'check' : 'shot'} size={14} color={colors.accentInk} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.doseName}>
                        {dose.vaccineName} · {dose.doseLabel}
                      </Text>
                      <Text style={styles.doseAge}>{dose.ageNote}</Text>
                    </View>
                    {busyId === dose.id ? (
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
          ))}
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
    title: { fontSize: 17, fontWeight: '800', color: colors.ink },
    disclaimer: { backgroundColor: colors.peach, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
    disclaimerText: { fontSize: 11.5, color: colors.accentInk, lineHeight: 16 },
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
    groupHint: { fontSize: 11, color: colors.accentInk, fontWeight: '600' },
    doseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    iconDot: { width: 26, height: 26, borderRadius: 9, backgroundColor: colors.peachSoft, alignItems: 'center', justifyContent: 'center' },
    iconDotDone: { backgroundColor: colors.peach },
    doseName: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
    doseAge: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
    badgeText: { fontSize: 11, fontWeight: '700' },
    badgeDone: { backgroundColor: colors.peach },
    badgeDoneText: { color: colors.accentInk },
    badgeDue: { backgroundColor: colors.peachSoft },
    badgeDueText: { color: colors.accentInk },
    badgeUpcoming: { backgroundColor: colors.bg },
    badgeUpcomingText: { color: colors.inkFaint },
  });
}
