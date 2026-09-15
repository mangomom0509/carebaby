import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { createInviteCode } from '../../lib/api/family';
import { useTheme, type ThemeMode } from '../../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../../lib/theme';

const MODE_LABEL: Record<ThemeMode, string> = { light: '라이트', dark: '다크', system: '시스템' };

export default function ProfileScreen() {
  const { child, family, membership, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCode = async () => {
    if (!family) return;
    setLoading(true);
    try {
      const c = await createInviteCode(family.id);
      setCode(c);
      setCopied(false);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>내정보</Text>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>아이</Text>
        <Text style={styles.body}>{child?.name}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>가족 그룹</Text>
        <Text style={styles.body}>{family?.name}</Text>
        <Text style={styles.sub}>내 역할: {membership?.role === 'owner' ? '관리자' : '구성원'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>화면 테마</Text>
        <View style={styles.themeRow}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
            <TouchableOpacity key={m} style={[styles.themeChip, mode === m && styles.themeChipActive]} onPress={() => setMode(m)}>
              <Text style={[styles.themeChipText, mode === m && styles.themeChipTextActive]}>{MODE_LABEL[m]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>가족 추가</Text>
        <Text style={styles.sub}>초대 코드를 만들어서 배우자, 돌봄 선생님께 공유하세요. 코드는 7일간 유효해요.</Text>
        {code ? (
          <TouchableOpacity style={styles.codeBox} onPress={copy}>
            <Text style={styles.codeText}>{code}</Text>
            <Text style={styles.codeHint}>{copied ? '복사됐어요!' : '눌러서 복사'}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.button} onPress={generateCode} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>{code ? '새 코드 만들기' : '초대 코드 만들기'}</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={signOut} style={{ marginTop: spacing.lg }}>
        <Text style={styles.signOut}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    title: { fontSize: 19, fontWeight: '800', color: colors.ink, marginBottom: spacing.lg },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    eyebrow: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft, marginBottom: 6 },
    body: { fontSize: 15, fontWeight: '700', color: colors.ink },
    sub: { fontSize: 12, color: colors.inkSoft, marginTop: 4, lineHeight: 17 },
    themeRow: { flexDirection: 'row', gap: spacing.sm },
    themeChip: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      paddingVertical: 10,
      alignItems: 'center',
    },
    themeChipActive: { borderColor: colors.peachDeep, backgroundColor: colors.peach },
    themeChipText: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
    themeChipTextActive: { color: colors.ink },
    codeBox: { backgroundColor: colors.peach, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md },
    codeText: { fontSize: 26, fontWeight: '800', letterSpacing: 6, color: colors.ink },
    codeHint: { fontSize: 11.5, color: colors.inkSoft, marginTop: 6, fontWeight: '600' },
    button: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: spacing.md },
    buttonText: { color: colors.bg, fontSize: 14, fontWeight: '700' },
    signOut: { textAlign: 'center', color: colors.inkFaint, fontSize: 12.5 },
  });
}
