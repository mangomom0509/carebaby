import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { createInviteCode } from '../../lib/api/family';
import { colors, radius, spacing } from '../../lib/theme';

export default function ProfileScreen() {
  const { child, family, membership, signOut } = useAuth();
  const insets = useSafeAreaInsets();
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
        <Text style={styles.eyebrow}>가족 추가</Text>
        <Text style={styles.sub}>초대 코드를 만들어서 배우자, 돌봄 선생님께 공유하세요. 코드는 7일간 유효해요.</Text>
        {code ? (
          <TouchableOpacity style={styles.codeBox} onPress={copy}>
            <Text style={styles.codeText}>{code}</Text>
            <Text style={styles.codeHint}>{copied ? '복사됐어요!' : '눌러서 복사'}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.button} onPress={generateCode} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{code ? '새 코드 만들기' : '초대 코드 만들기'}</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={signOut} style={{ marginTop: spacing.lg }}>
        <Text style={styles.signOut}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  codeBox: { backgroundColor: colors.peach, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  codeText: { fontSize: 26, fontWeight: '800', letterSpacing: 6, color: colors.ink },
  codeHint: { fontSize: 11.5, color: colors.inkSoft, marginTop: 6, fontWeight: '600' },
  button: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: spacing.md },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  signOut: { textAlign: 'center', color: colors.inkFaint, fontSize: 12.5 },
});
