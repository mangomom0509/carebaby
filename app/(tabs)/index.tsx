import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { ageMonths, dPlus, parseISO, todayStart } from '../../lib/dates';
import { colors, radius, spacing } from '../../lib/theme';

export default function HomeScreen() {
  const { child, family, membership } = useAuth();

  if (!child) return null;

  const birth = parseISO(child.birth);
  const today = todayStart();
  const months = ageMonths(birth, today);
  const days = dPlus(birth, today);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{child.name.slice(0, 1)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{child.name}</Text>
          <Text style={styles.age}>
            {months}개월 · D+{days}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>가족 그룹</Text>
        <Text style={styles.cardBody}>
          {family?.name} · {membership?.role === 'owner' ? '관리자' : '구성원'}로 참여 중이에요.
        </Text>
        <TouchableOpacity style={styles.inviteBtn} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.inviteBtnText}>초대 코드 만들어서 가족 추가하기 →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>오늘</Text>
        <Text style={styles.cardBody}>기록 탭에서 오늘의 수유·수면·기저귀 등을 기록해보세요.</Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/(tabs)/record')}>
          <Text style={styles.linkBtnText}>기록 탭으로 이동 →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>예방접종</Text>
        <Text style={styles.cardBody}>표준예방접종일정표 기준으로 언제 어떤 접종을 맞을 때인지 확인해보세요.</Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/vaccines')}>
          <Text style={styles.linkBtnText}>예방접종 일정 보기 →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>다음에 만들 화면들</Text>
        <Text style={styles.noteBody}>발달 체크(WHO 기준), 고정 스케줄표는 다음 작업에서 이 앱으로 옮겨질 예정이에요.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.coral },
  name: { fontSize: 17, fontWeight: '800', color: colors.ink },
  age: { fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardEyebrow: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft, marginBottom: 6 },
  cardBody: { fontSize: 13.5, color: colors.ink, lineHeight: 19 },
  inviteBtn: { marginTop: spacing.md },
  inviteBtnText: { color: colors.coral, fontSize: 12.5, fontWeight: '700' },
  linkBtn: { marginTop: spacing.md },
  linkBtnText: { color: colors.coral, fontSize: 12.5, fontWeight: '700' },
  noteCard: { backgroundColor: colors.butter, borderRadius: radius.lg, padding: spacing.lg },
  noteTitle: { fontSize: 12.5, fontWeight: '800', color: colors.butterDeep, marginBottom: 6 },
  noteBody: { fontSize: 12, color: colors.ink, lineHeight: 18 },
});
