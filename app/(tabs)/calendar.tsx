import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../lib/theme';

export default function CalendarScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>캘린더</Text>
      <View style={styles.card}>
        <Text style={styles.body}>사진 캘린더, 예방접종·검진 일정 표시는 다음 작업에서 이어서 만들 예정이에요.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  title: { fontSize: 19, fontWeight: '800', color: colors.ink, marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
  body: { fontSize: 13, color: colors.inkSoft, lineHeight: 19 },
});
