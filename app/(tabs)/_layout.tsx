import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { useTheme } from '../../lib/theme-context';

// react-navigation's tabBarIcon color is typed as RN's broad ColorValue (string |
// number | NativeColorValue | null) to cover animated/processed colors, but we
// only ever pass the plain hex strings from tabBarActiveTintColor/InactiveTintColor
// below, so narrowing to a string here is safe.
const tabIconColor = (c: unknown): string | undefined => (typeof c === 'string' ? c : undefined);

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();

  if (!loading && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { borderTopColor: colors.line, backgroundColor: colors.card },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '홈', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={tabIconColor(color)} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: '캘린더', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={tabIconColor(color)} /> }}
      />
      <Tabs.Screen
        name="record"
        options={{ title: '기록', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={tabIconColor(color)} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: '내정보', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={tabIconColor(color)} /> }}
      />
    </Tabs>
  );
}
