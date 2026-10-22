import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { listPlayLogsForChild } from '../lib/api/play-logs';
import { deleteAllPeerPlayStats, fetchPeerPlayStats, submitPeerPlayStats } from '../lib/api/peer-stats';
import { clearAnonId, getOrCreateAnonId } from '../lib/anon-id';
import { getPeerStatsConsent, setPeerStatsConsent } from '../lib/peer-consent';
import { ageMonths, isoWeekString, parseISO, todayStart } from '../lib/dates';
import { domainColor, type DevDomain } from '../lib/dev-milestones';
import { Icon } from '../lib/icons';
import { bandForAgeMonths } from '../lib/play-ideas';
import { domainCountsForWeek, topDomains } from '../lib/peer-stats';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';

const DOMAINS: DevDomain[] = ['대근육', '소근육', '언어', '인지', '사회정서'];

export default function PeerStatsScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [consent, setConsentState] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const [agreeing, setAgreeing] = useState(false);
  const [myCounts, setMyCounts] = useState<Partial<Record<DevDomain, number>>>({});
  const [peerLoading, setPeerLoading] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [peerDomainCounts, setPeerDomainCounts] = useState<Record<string, number> | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!child) return;
    getPeerStatsConsent(child.id).then(setConsentState);
  }, [child]);

  const load = useCallback(async () => {
    if (!child || !consent) return;
    setPeerLoading(true);
    try {
      const band = bandForAgeMonths(ageMonths(parseISO(child.birth), todayStart()));
      const week = isoWeekString(todayStart());

      const logs = await listPlayLogsForChild(child.id);
      const counts = domainCountsForWeek(logs, todayStart());
      setMyCounts(counts);

      const anonId = await getOrCreateAnonId(child.id);
      await submitPeerPlayStats(anonId, band, week, counts as Record<string, number>);

      const result = await fetchPeerPlayStats(band, week);
      setParticipantCount(result.participantCount);
      setPeerDomainCounts(result.domainCounts);
    } finally {
      setPeerLoading(false);
    }
  }, [child, consent]);

  useEffect(() => {
    load();
  }, [load]);

  const agree = async () => {
    if (!child || !checked) return;
    setAgreeing(true);
    try {
      await setPeerStatsConsent(child.id, true);
      setConsentState(true);
    } finally {
      setAgreeing(false);
    }
  };

  const withdraw = () => {
    if (!child) return;
    Alert.alert('동의를 철회할까요?', '지금까지 모인 익명 기록이 서버에서 삭제되고, 다시 동의하기 전까지 이 통계를 볼 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '철회하기',
        style: 'destructive',
        onPress: async () => {
          setWithdrawing(true);
          try {
            const anonId = await getOrCreateAnonId(child.id);
            await deleteAllPeerPlayStats(anonId);
            await clearAnonId(child.id);
            await setPeerStatsConsent(child.id, false);
            setConsentState(false);
            setChecked(false);
            setPeerDomainCounts(null);
            setParticipantCount(0);
          } finally {
            setWithdrawing(false);
          }
        },
      },
    ]);
  };

  if (!child || consent === null) return null;

  const maxCount = Math.max(1, ...DOMAINS.map((d) => myCounts[d] ?? 0));
  const peerText =
    peerDomainCounts && Object.keys(peerDomainCounts).length > 0
      ? `또래들은 이번 주에 ${topDomains(peerDomainCounts, 2)
          .map((d) => `${d} 놀이`)
          .join('와 ')}를 많이 했어요.`
      : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Icon name="chevL" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>또래 친구들은 이번 주에</Text>
        <View style={{ width: 28 }} />
      </View>

      {!consent ? (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <View style={styles.consentCard}>
            <Text style={styles.consentHeading}>모으는 정보</Text>
            <Text style={styles.consentText}>
              아이의 월령 구간, 주차, 발달 영역별 놀이 횟수만 모아요. 이름·생년월일·기기 정보·위치는 서버로 보내지 않고, 로그인 계정과 무관한
              무작위 익명 ID로만 구분돼요.
            </Text>
            <Text style={styles.consentHeading}>쓰는 곳</Text>
            <Text style={styles.consentText}>같은 월령 구간 참여자가 5명 이상 모였을 때만 합산해서, 참고용 놀이 아이디어를 보여주는 데만 써요.</Text>
            <Text style={styles.consentHeading}>보관 기간</Text>
            <Text style={styles.consentText}>동의를 철회하면 즉시 서버에서 삭제돼요. 철회 전까지는 이 기능을 제공하는 목적으로만 보관돼요.</Text>

            <TouchableOpacity style={styles.checkboxRow} onPress={() => setChecked((v) => !v)}>
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked ? <Icon name="check" size={12} color={colors.accentOn} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>만 14세 이상 보호자가 확인했어요</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.agreeBtn, (!checked || agreeing) && styles.agreeBtnDisabled]}
              onPress={agree}
              disabled={!checked || agreeing}
            >
              {agreeing ? <ActivityIndicator size="small" color={colors.accentOn} /> : <Text style={styles.agreeBtnText}>동의하고 시작</Text>}
            </TouchableOpacity>
            <Text style={styles.consentFooter}>동의하지 않아도 토닥의 다른 기능은 그대로 사용할 수 있어요.</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <Text style={styles.sectionLabel}>우리 아이 발달 영역 균형</Text>
          <View style={styles.card}>
            <Text style={styles.cardSub}>이번 주 기록 기준이에요</Text>
            {DOMAINS.map((d) => {
              const count = myCounts[d] ?? 0;
              return (
                <View key={d} style={styles.barRow}>
                  <Text style={styles.barLabel}>{d}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(count / maxCount) * 100}%`, backgroundColor: domainColor(d, colors) }]} />
                  </View>
                  <Text style={styles.barCount}>{count}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>또래 친구들은 이번 주에</Text>
          <View style={styles.card}>
            {peerLoading ? (
              <ActivityIndicator color={colors.ink} />
            ) : participantCount < 5 ? (
              <Text style={styles.peerGathering}>아직 또래 기록이 모이는 중이에요</Text>
            ) : peerText ? (
              <Text style={styles.peerText}>{peerText}</Text>
            ) : (
              <Text style={styles.peerGathering}>아직 또래 기록이 모이는 중이에요</Text>
            )}
          </View>

          <TouchableOpacity style={styles.withdrawBtn} onPress={withdraw} disabled={withdrawing}>
            {withdrawing ? <ActivityIndicator size="small" color={colors.inkSoft} /> : <Text style={styles.withdrawText}>동의 철회</Text>}
          </TouchableOpacity>
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
    consentCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
    consentHeading: { fontSize: 12.5, fontWeight: '800', color: colors.inkSoft, marginTop: spacing.md, marginBottom: 4 },
    consentText: { fontSize: 13, color: colors.ink, lineHeight: 19 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.lg },
    checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkboxLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
    agreeBtn: { marginTop: spacing.lg, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
    agreeBtnDisabled: { opacity: 0.4 },
    agreeBtnText: { fontSize: 14, fontWeight: '800', color: colors.accentOn },
    consentFooter: { fontSize: 11, color: colors.inkFaint, lineHeight: 16, textAlign: 'center', marginTop: spacing.md },
    sectionLabel: { fontSize: 13, fontWeight: '800', color: colors.inkSoft, marginBottom: spacing.sm, marginTop: spacing.md },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
    cardSub: { fontSize: 11, color: colors.inkFaint, marginBottom: spacing.md },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    barLabel: { width: 48, fontSize: 11.5, fontWeight: '700', color: colors.inkSoft },
    barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.bg, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },
    barCount: { width: 20, fontSize: 11.5, color: colors.inkFaint, textAlign: 'right' },
    peerGathering: { fontSize: 13.5, color: colors.inkSoft, textAlign: 'center', paddingVertical: spacing.sm },
    peerText: { fontSize: 14, color: colors.ink, lineHeight: 20, textAlign: 'center', paddingVertical: spacing.sm, fontWeight: '600' },
    withdrawBtn: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.sm },
    withdrawText: { fontSize: 12.5, color: colors.inkFaint, textDecorationLine: 'underline' },
  });
}
