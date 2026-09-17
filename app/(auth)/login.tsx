import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../../lib/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) {
      setError(err.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 올바르지 않아요.' : err.message);
      return;
    }
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.logo}>토닥</Text>
      <Text style={styles.subtitle}>로그인하고 우리 아이 기록을 이어가요</Text>

      <View style={styles.field}>
        <Text style={styles.label}>이메일</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.inkFaint}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="********"
          placeholderTextColor={colors.inkFaint}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '로그인 중...' : '로그인'}</Text>
      </TouchableOpacity>

      <Link href="/(auth)/signup" style={styles.link}>
        아직 계정이 없으신가요? 회원가입
      </Link>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center' },
    logo: { fontSize: 30, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
    subtitle: { fontSize: 13.5, color: colors.inkSoft, textAlign: 'center', marginBottom: spacing.xl * 1.5 },
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
    error: { color: colors.feverInk, fontSize: 12.5, marginBottom: spacing.md, textAlign: 'center' },
    button: {
      backgroundColor: colors.ink,
      borderRadius: radius.md,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    buttonText: { color: colors.bg, fontSize: 15, fontWeight: '700' },
    link: { textAlign: 'center', color: colors.accent, fontSize: 13, marginTop: spacing.lg, fontWeight: '600' },
  });
}
