import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { addRecord, listRecordsForDate } from '../../lib/api/records';
import { toISO, todayStart } from '../../lib/dates';
import { colors, radius, spacing } from '../../lib/theme';
import type { RecordEntry, RecordType } from '../../lib/types';

const TYPE_META: Record<RecordType, { label: string; unit: string | null; color: string }> = {
  feed: { label: '수유', unit: 'ml', color: colors.sky },
  water: { label: '물', unit: 'ml', color: colors.sky },
  meal: { label: '이유식', unit: 'g', color: colors.butter },
  kidmeal: { label: '유아식', unit: 'g', color: colors.butter },
  snack: { label: '간식', unit: 'g', color: colors.butter },
  sleep: { label: '수면', unit: null, color: colors.mint },
  diaper: { label: '기저귀', unit: null, color: colors.peach },
  shot: { label: '접종', unit: null, color: colors.sky },
  temp: { label: '체온', unit: '°C', color: colors.peach },
  routine: { label: '일과', unit: null, color: colors.peach },
};

const QUICK_TYPES: RecordType[] = ['feed', 'water', 'meal', 'sleep', 'diaper', 'temp'];

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function RecordScreen() {
  const { child } = useAuth();
  const todayIso = useMemo(() => toISO(todayStart()), []);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<RecordType>('feed');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!child) return;
    const rows = await listRecordsForDate(child.id, todayIso);
    setRecords(rows);
    setLoading(false);
  }, [child, todayIso]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates from other family members' devices.
  useEffect(() => {
    if (!child) return;
    const channel = supabase
      .channel(`records-${child.id}-${todayIso}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'records', filter: `child_id=eq.${child.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [child, todayIso, load]);

  const meta = TYPE_META[selectedType];

  const save = async () => {
    if (!child) return;
    setSaving(true);
    try {
      await addRecord({
        childId: child.id,
        date: todayIso,
        time: nowTime(),
        type: selectedType,
        amount: meta.unit ? Number(amount) || 0 : null,
      });
      setAmount('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!child) return null;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>기록</Text>

      <View style={styles.typeRow}>
        {QUICK_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, selectedType === t && styles.typeChipActive]}
            onPress={() => setSelectedType(t)}
          >
            <Text style={[styles.typeChipText, selectedType === t && styles.typeChipTextActive]}>{TYPE_META[t].label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.addRow}>
        {meta.unit ? (
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder={`예: 140`}
            placeholderTextColor={colors.inkFaint}
            keyboardType="numeric"
          />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>지금 기록</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl * 2 }}
          ListEmptyComponent={<Text style={styles.empty}>아직 오늘 기록이 없어요.</Text>}
          renderItem={({ item }) => {
            const m = TYPE_META[item.type];
            return (
              <View style={styles.timelineItem}>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <View style={[styles.timelineDot, { backgroundColor: m.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineLabel}>{m.label}</Text>
                  {item.amount != null ? (
                    <Text style={styles.timelineSub}>
                      {item.amount}
                      {m.unit}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  title: { fontSize: 19, fontWeight: '800', color: colors.ink, marginBottom: spacing.lg },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  typeChipActive: { borderColor: colors.peachDeep, backgroundColor: colors.peach },
  typeChipText: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
  typeChipTextActive: { color: colors.ink },
  addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  amountInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  saveBtn: { backgroundColor: colors.ink, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 12 },
  saveBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.inkFaint, fontSize: 12.5, marginTop: spacing.xl },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  timelineTime: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, width: 44 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLabel: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  timelineSub: { fontSize: 11.5, color: colors.inkSoft, marginTop: 1 },
});
