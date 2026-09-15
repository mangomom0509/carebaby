import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTheme } from '../lib/theme-context';
import type { ColorPalette } from '../lib/theme';

export default function Index() {
  const { loading, session, family, child } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Supabase 설정이 필요해요</Text>
        <Text style={styles.body}>
          .env.example을 .env로 복사하고, Supabase 프로젝트의 URL과 anon key를 채운 뒤 앱을 다시 시작해주세요.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;
  if (!family) return <Redirect href="/(auth)/family" />;
  if (!child) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
    title: { fontSize: 17, fontWeight: '800', marginBottom: 10, color: colors.ink },
    body: { fontSize: 13.5, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  });
}
