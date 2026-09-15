import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { createChild } from '../lib/api/children';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';
import type { Gender } from '../lib/types';

export default function OnboardingScreen() {
  const { family, refresh } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [birth, setBirth] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(birth) && gender;

  const submit = async () => {
    if (!family || !valid) return;
    setError(null);
    setLoading(true);
    try {
      await createChild({ familyId: family.id, name: name.trim(), birth, gender: gender! });
      await refresh();
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? '등록하지 못했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>아이 정보를 등록해주세요</Text>
      <Text style={styles.subtitle}>가족 구성원 모두가 이 정보를 함께 보게 돼요.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>이름(애칭)</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="예: 떠율" placeholderTextColor={colors.inkFaint} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>생년월일</Text>
        <TextInput
          style={styles.input}
          value={birth}
          onChangeText={setBirth}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.inkFaint}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>성별</Text>
        <View style={styles.row}>
          {(['여아', '남아'] as Gender[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, gender === g && styles.chipActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, !valid && styles.buttonDisabled]} onPress={submit} disabled={!valid || loading}>
        {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>시작하기</Text>}
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 13, color: colors.inkSoft, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 19 },
    field: { marginBottom: spacing.lg },
    label: { fontSize: 12.5, fontWeight: '700', color: colors.inkSoft, marginBottom: 6 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.ink,
    },
    row: { flexDirection: 'row', gap: spacing.sm },
    chip: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    chipActive: { borderColor: colors.peachDeep, backgroundColor: colors.peach },
    chipText: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
    chipTextActive: { color: colors.ink },
    error: { color: colors.danger, fontSize: 12.5, marginBottom: spacing.md, textAlign: 'center' },
    button: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.sm },
    buttonDisabled: { opacity: 0.4 },
    buttonText: { color: colors.bg, fontSize: 15, fontWeight: '700' },
  });
}
