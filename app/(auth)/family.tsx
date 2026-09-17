import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../lib/auth-context';
import { createFamily, createInviteCode, joinFamilyByCode, JoinFamilyError } from '../../lib/api/family';
import { useTheme } from '../../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../../lib/theme';

type Mode = 'choose' | 'create' | 'created' | 'join';

export default function FamilyScreen() {
  const { refresh, signOut } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>('choose');
  const [familyName, setFamilyName] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setError(null);
    setLoading(true);
    try {
      const familyId = await createFamily(familyName.trim() || '우리 가족');
      const inviteCode = await createInviteCode(familyId);
      setGeneratedCode(inviteCode);
      setMode('created');
    } catch (e: any) {
      setError(e.message ?? '가족을 만들지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setError(null);
    if (!code.trim()) {
      setError('초대 코드를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await joinFamilyByCode(code);
      await refresh();
      router.replace('/');
    } catch (e) {
      if (e instanceof JoinFamilyError) {
        setError(e.reason === 'code_expired' ? '만료된 코드예요. 코드를 다시 요청해주세요.' : '유효하지 않은 코드예요. 다시 확인해주세요.');
      } else {
        setError('참여하지 못했어요. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (mode === 'choose') {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>가족 그룹을 시작해요</Text>
        <Text style={styles.subtitle}>아이 정보를 함께 볼 가족을 새로 만들거나, 이미 받은 초대 코드로 참여하세요.</Text>

        <TouchableOpacity style={styles.optionCard} onPress={() => setMode('create')}>
          <Text style={styles.optionTitle}>새 가족 만들기</Text>
          <Text style={styles.optionBody}>처음 시작하는 분이에요. 아이 정보를 새로 등록할게요.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setMode('join')}>
          <Text style={styles.optionTitle}>초대 코드로 참여하기</Text>
          <Text style={styles.optionBody}>엄마·아빠·돌봄 선생님께 받은 6자리 코드를 입력해요.</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={signOut} style={{ marginTop: spacing.xl }}>
          <Text style={styles.signOut}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'create') {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>가족 이름 (선택)</Text>
        <Text style={styles.subtitle}>나중에 프로필에서 바꿀 수 있어요.</Text>
        <TextInput
          style={styles.input}
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="예: 떠율이네"
          placeholderTextColor={colors.inkFaint}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>가족 만들기</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('choose')} style={{ marginTop: spacing.lg }}>
          <Text style={styles.link}>뒤로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'created') {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>가족이 만들어졌어요</Text>
        <Text style={styles.subtitle}>이 코드를 다른 가족·돌봄 선생님께 공유하면 같은 아이 정보를 함께 볼 수 있어요. (7일간 유효)</Text>
        <TouchableOpacity style={styles.codeBox} onPress={copyCode}>
          <Text style={styles.codeText}>{generatedCode}</Text>
          <Text style={styles.codeHint}>{copied ? '복사됐어요!' : '눌러서 복사'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            await refresh();
            router.replace('/');
          }}
        >
          <Text style={styles.buttonText}>계속하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // mode === 'join'
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>초대 코드 입력</Text>
      <Text style={styles.subtitle}>받으신 6자리 코드를 입력해주세요.</Text>
      <TextInput
        style={[styles.input, styles.codeInput]}
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        placeholder="ABC123"
        placeholderTextColor={colors.inkFaint}
        autoCapitalize="characters"
        maxLength={6}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>참여하기</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setMode('choose')} style={{ marginTop: spacing.lg }}>
        <Text style={styles.link}>뒤로</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 13, color: colors.inkSoft, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 19 },
    optionCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.line,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    optionTitle: { fontSize: 15.5, fontWeight: '700', color: colors.ink, marginBottom: 4 },
    optionBody: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.ink,
      marginBottom: spacing.lg,
    },
    codeInput: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 6 },
    error: { color: colors.feverInk, fontSize: 12.5, marginBottom: spacing.md, textAlign: 'center' },
    button: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
    buttonText: { color: colors.bg, fontSize: 15, fontWeight: '700' },
    link: { textAlign: 'center', color: colors.accent, fontSize: 13, fontWeight: '600' },
    signOut: { textAlign: 'center', color: colors.inkFaint, fontSize: 12.5 },
    codeBox: {
      backgroundColor: colors.peach,
      borderRadius: radius.lg,
      paddingVertical: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    codeText: { fontSize: 34, fontWeight: '800', letterSpacing: 8, color: colors.ink },
    codeHint: { fontSize: 12, color: colors.inkSoft, marginTop: 8, fontWeight: '600' },
  });
}
