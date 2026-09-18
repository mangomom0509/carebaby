import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useAuth } from '../lib/auth-context';
import { deleteGrowthRecord, listGrowthRecords, saveGrowthRecord } from '../lib/api/growth';
import { ageDays, ageMonths, parseISO, toISO, todayStart } from '../lib/dates';
import { headCircumferencePercentile, lengthPercentile, weightPercentile, type GrowthPercentile } from '../lib/growth-standards';
import { Icon } from '../lib/icons';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';
import type { GrowthRecord } from '../lib/types';

function fmtDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function GrowthScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formHeight, setFormHeight] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formHead, setFormHead] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!child) return;
    setLoading(true);
    try {
      setRecords(await listGrowthRecords(child.id));
    } finally {
      setLoading(false);
    }
  }, [child]);

  useEffect(() => {
    load();
  }, [load]);

  if (!child) return null;

  const birth = parseISO(child.birth);
  const sorted = records.slice().sort((a, b) => (a.measured_date < b.measured_date ? -1 : 1));
  const latest = sorted[sorted.length - 1] ?? null;
  const latestAgeDays = latest ? ageDays(birth, parseISO(latest.measured_date)) : 0;
  const wPct = latest?.weight_kg != null ? weightPercentile(child.gender, latestAgeDays, latest.weight_kg) : null;
  const hPct = latest?.height_cm != null ? lengthPercentile(child.gender, latestAgeDays, latest.height_cm) : null;
  const cPct = latest?.head_circumference_cm != null ? headCircumferencePercentile(child.gender, latestAgeDays, latest.head_circumference_cm) : null;

  const openAdd = () => {
    setFormDate(toISO(todayStart()));
    setFormHeight(latest?.height_cm != null ? String(latest.height_cm) : '');
    setFormWeight(latest?.weight_kg != null ? String(latest.weight_kg) : '');
    setFormHead(latest?.head_circumference_cm != null ? String(latest.head_circumference_cm) : '');
    setModalOpen(true);
  };

  const save = async () => {
    if (!child || !/^\d{4}-\d{2}-\d{2}$/.test(formDate)) return;
    setSaving(true);
    try {
      await saveGrowthRecord({
        childId: child.id,
        date: formDate,
        heightCm: formHeight ? Number(formHeight) : null,
        weightKg: formWeight ? Number(formWeight) : null,
        headCircumferenceCm: formHead ? Number(formHead) : null,
      });
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await deleteGrowthRecord(id);
    await load();
  };

  const weightPoints = sorted.filter((r) => r.weight_kg != null).map((r) => ({ x: r.measured_date, y: r.weight_kg as number }));
  const heightPoints = sorted.filter((r) => r.height_cm != null).map((r) => ({ x: r.measured_date, y: r.height_cm as number }));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Icon name="chevL" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>성장 기록</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 3 }}>
          {latest ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryDate}>
                {fmtDate(latest.measured_date)} 기준 · {ageMonths(birth, parseISO(latest.measured_date))}개월
              </Text>
              <PercentileRow
                label="몸무게"
                value={latest.weight_kg != null ? `${latest.weight_kg}kg` : '-'}
                pct={wPct}
                colors={colors}
                styles={styles}
              />
              <PercentileRow
                label="키"
                value={latest.height_cm != null ? `${latest.height_cm}cm` : '-'}
                pct={hPct}
                colors={colors}
                styles={styles}
              />
              <PercentileRow
                label="머리둘레"
                value={latest.head_circumference_cm != null ? `${latest.head_circumference_cm}cm` : '-'}
                pct={cPct}
                colors={colors}
                styles={styles}
              />
              <Text style={styles.summaryNote}>
                또래 비교는 세계보건기구(WHO) 아동성장표준 기준이에요. 한국 질병관리청 2017 성장도표도 0~35개월 구간은 같은 기준을 사용해요.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>아직 기록이 없어요. 키·몸무게를 기록하면 또래 비교와 성장 그래프를 볼 수 있어요.</Text>
            </View>
          )}

          {weightPoints.length >= 2 ? (
            <>
              <Text style={styles.sectionTitle}>몸무게 변화</Text>
              <GrowthChart points={weightPoints} colors={colors} unit="kg" />
            </>
          ) : null}
          {heightPoints.length >= 2 ? (
            <>
              <Text style={styles.sectionTitle}>키 변화</Text>
              <GrowthChart points={heightPoints} colors={colors} unit="cm" />
            </>
          ) : null}

          {sorted.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>기록 목록</Text>
              {sorted
                .slice()
                .reverse()
                .map((r) => (
                  <View key={r.id} style={styles.historyRow}>
                    <Text style={styles.historyDate}>{fmtDate(r.measured_date)}</Text>
                    <Text style={styles.historyVal}>
                      {[
                        r.height_cm != null ? `키 ${r.height_cm}cm` : null,
                        r.weight_kg != null ? `몸무게 ${r.weight_kg}kg` : null,
                        r.head_circumference_cm != null ? `머리둘레 ${r.head_circumference_cm}cm` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '-'}
                    </Text>
                    <TouchableOpacity onPress={() => remove(r.id)} hitSlop={8}>
                      <Icon name="x" size={13} color={colors.inkFaint} />
                    </TouchableOpacity>
                  </View>
                ))}
            </>
          ) : null}
        </ScrollView>
      )}

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={openAdd}>
        <Icon name="plus" size={22} color={colors.accentOn} />
      </TouchableOpacity>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.modalTitle}>성장 기록 추가</Text>
            <Text style={styles.fieldLabel}>측정일 (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={formDate} onChangeText={setFormDate} placeholder="2026-09-18" placeholderTextColor={colors.inkFaint} />
            <Text style={styles.fieldLabel}>키 (cm)</Text>
            <TextInput
              style={styles.input}
              value={formHeight}
              onChangeText={setFormHeight}
              keyboardType="decimal-pad"
              placeholder="예: 65.5"
              placeholderTextColor={colors.inkFaint}
            />
            <Text style={styles.fieldLabel}>몸무게 (kg)</Text>
            <TextInput
              style={styles.input}
              value={formWeight}
              onChangeText={setFormWeight}
              keyboardType="decimal-pad"
              placeholder="예: 7.2"
              placeholderTextColor={colors.inkFaint}
            />
            <Text style={styles.fieldLabel}>머리둘레 (cm)</Text>
            <TextInput
              style={styles.input}
              value={formHead}
              onChangeText={setFormHead}
              keyboardType="decimal-pad"
              placeholder="예: 42.5"
              placeholderTextColor={colors.inkFaint}
            />
            <TouchableOpacity style={styles.modalBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.accentOn} /> : <Text style={styles.modalBtnText}>저장하기</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PercentileRow({
  label,
  value,
  pct,
  colors,
  styles,
}: {
  label: string;
  value: string;
  pct: GrowthPercentile | null;
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.pctRow}>
      <View style={styles.pctLeft}>
        <Text style={styles.pctLabel}>{label}</Text>
        <Text style={styles.pctValue}>{value}</Text>
      </View>
      <View style={styles.pctRight}>
        {pct ? (
          <>
            <Text style={styles.pctText}>또래 100명 중 {pct.percentile}번째</Text>
            <View style={styles.pctTrack}>
              <View style={[styles.pctFill, { width: `${pct.percentile}%`, backgroundColor: colors.peachDeep }]} />
              <View style={[styles.pctDot, { left: `${pct.percentile}%`, backgroundColor: colors.accent }]} />
            </View>
          </>
        ) : (
          <Text style={styles.pctTextMuted}>비교할 데이터가 부족해요</Text>
        )}
      </View>
    </View>
  );
}

function GrowthChart({ points, colors, unit }: { points: { x: string; y: number }[]; colors: ColorPalette; unit: string }) {
  const W = 326;
  const H = 110;
  const PAD = 16;
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: PAD + i * stepX,
    y: H - PAD - ((p.y - minY) / spanY) * (H - PAD * 2),
  }));
  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Polyline points={polylinePoints} fill="none" stroke={colors.peachDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={3} fill={colors.accent} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>{fmtDate(points[0].x)}</Text>
        <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.ink }}>
          {points[points.length - 1].y}
          {unit}
        </Text>
        <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>{fmtDate(points[points.length - 1].x)}</Text>
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
    summaryCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, marginBottom: spacing.md },
    summaryDate: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft, marginBottom: spacing.md },
    emptyCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    emptyText: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 18, textAlign: 'center' },
    pctRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
    pctLeft: { width: 78 },
    pctLabel: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },
    pctValue: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 2 },
    pctRight: { flex: 1 },
    pctText: { fontSize: 11.5, fontWeight: '700', color: colors.accentInk, marginBottom: 6 },
    pctTextMuted: { fontSize: 11.5, color: colors.inkFaint },
    pctTrack: { height: 6, backgroundColor: colors.line, borderRadius: 99, overflow: 'visible' },
    pctFill: { height: 6, borderRadius: 99 },
    pctDot: { position: 'absolute', top: -3, width: 12, height: 12, borderRadius: 6, marginLeft: -6 },
    summaryNote: { fontSize: 10.5, color: colors.inkFaint, lineHeight: 15, marginTop: spacing.md },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.sm },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
    historyDate: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, width: 56 },
    historyVal: { flex: 1, fontSize: 12.5, color: colors.ink },
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
    modalTitle: { fontSize: 16.5, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
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
    modalBtn: { backgroundColor: colors.accent, borderRadius: 15, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
    modalBtnText: { color: colors.accentOn, fontSize: 16, fontWeight: '700' },
  });
}
