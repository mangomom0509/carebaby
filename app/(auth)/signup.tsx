import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../lib/theme';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError('이메일을 입력하고, 비밀번호는 6자 이상으로 설정해주세요.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.session) {
      router.replace('/');
    } else {
      setNeedsConfirmation(true);
    }
  };

  if (needsConfirmation) {
    return (
      <View style={styles.screen}>
        <Text style={styles.logo}>토닥</Text>
        <Text style={styles.subtitle}>{email}로 인증 메일을 보냈어요. 메일함을 확인하고 인증을 완료한 뒤 로그인해주세요.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>로그인 화면으로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.logo}>토닥</Text>
      <Text style={styles.subtitle}>회원가입하고 우리 아이 기록을 시작해요</Text>

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
        <Text style={styles.label}>비밀번호 (6자 이상)</Text>
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
        <Text style={styles.buttonText}>{loading ? '가입 중...' : '회원가입'}</Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" style={styles.link}>
        이미 계정이 있으신가요? 로그인
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center' },
  logo: { fontSize: 30, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { fontSize: 13.5, color: colors.inkSoft, textAlign: 'center', marginBottom: spacing.xl * 1.5, lineHeight: 20 },
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
  error: { color: colors.danger, fontSize: 12.5, marginBottom: spacing.md, textAlign: 'center' },
  button: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  link: { textAlign: 'center', color: colors.coral, fontSize: 13, marginTop: spacing.lg, fontWeight: '600' },
});
