import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { setRegularPattern } from '../../lib/api/children';
import { createInviteCode } from '../../lib/api/family';
import { ageMonths, parseISO, todayStart } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { useTheme, type ThemeMode } from '../../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../../lib/theme';

const MODE_LABEL: Record<ThemeMode, string> = { light: '라이트', dark: '다크', system: '시스템' };

export default function ProfileScreen() {
  const { child, family, membership, signOut, refresh } = useAuth();
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

  const toggleRegularPattern = async (value: boolean) => {
    if (!child) return;
    await setRegularPattern(child.id, value);
    await refresh();
  };

  if (!child) return null;

  const birth = parseISO(child.birth);
  const months = ageMonths(birth, todayStart());

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.profileTop}>
        <View style={styles.avatar}>
          <Icon name="person" size={30} color={colors.accent} />
        </View>
        <Text style={styles.pname}>{child.name}</Text>
        <Text style={styles.pmeta}>
          {child.gender} · {birth.getFullYear()}.{String(birth.getMonth() + 1).padStart(2, '0')}.{String(birth.getDate()).padStart(2, '0')} 생 ·{' '}
          {months}개월
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>가족 그룹</Text>
            <Text style={styles.rowDesc}>
              {family?.name} · 내 역할: {membership?.role === 'owner' ? '관리자' : '구성원'}
            </Text>
          </View>
        </View>
        <View style={[styles.rowItem, styles.rowItemBorder]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>스케줄 있음</Text>
            <Text style={styles.rowDesc}>켜면 정해진 스케줄표로, 끄면 타임라인과 기록만으로 기록해요. 기록 탭에서도 바로 바꿀 수 있어요.</Text>
          </View>
          <Switch
            value={child.regular_pattern}
            onValueChange={toggleRegularPattern}
            trackColor={{ false: colors.line, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>
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
        <Text style={styles.rowDesc}>초대 코드를 만들어서 배우자, 돌봄 선생님께 공유하세요. 코드는 7일간 유효해요.</Text>
        {code ? (
          <TouchableOpacity style={styles.codeBox} onPress={copy}>
            <Text style={styles.codeText}>{code}</Text>
            <Text style={styles.codeHint}>{copied ? '복사됐어요!' : '눌러서 복사'}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.button} onPress={generateCode} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.accentOn} /> : <Text style={styles.buttonText}>{code ? '새 코드 만들기' : '초대 코드 만들기'}</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.footNote}>
        예방접종·검진 일정 출처: 질병관리청 국가예방접종 지침(연도별 표준접종시기표). 실제 접종 전 의료기관에 최신 지침을 다시 확인해주세요.
      </Text>

      <TouchableOpacity onPress={signOut} style={{ marginTop: spacing.md }}>
        <Text style={styles.signOut}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    profileTop: { alignItems: 'center', paddingVertical: spacing.lg },
    avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    pname: { fontWeight: '800', fontSize: 19, color: colors.ink },
    pmeta: { fontSize: 12.5, color: colors.inkSoft, marginTop: 4 },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    eyebrow: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft, marginBottom: 10 },
    rowItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 2 },
    rowItemBorder: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: spacing.md, paddingTop: spacing.md },
    rowTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
    rowDesc: { fontSize: 12, color: colors.inkSoft, marginTop: 4, lineHeight: 17 },
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
    themeChipTextActive: { color: colors.accentInk },
    codeBox: { backgroundColor: colors.peach, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md },
    codeText: { fontSize: 26, fontWeight: '800', letterSpacing: 6, color: colors.ink },
    codeHint: { fontSize: 11.5, color: colors.inkSoft, marginTop: 6, fontWeight: '600' },
    button: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: spacing.md },
    buttonText: { color: colors.accentOn, fontSize: 14, fontWeight: '700' },
    footNote: { fontSize: 11.5, color: colors.inkFaint, lineHeight: 17, paddingHorizontal: 4, marginTop: spacing.sm },
    signOut: { textAlign: 'center', color: colors.inkFaint, fontSize: 12.5 },
  });
}
