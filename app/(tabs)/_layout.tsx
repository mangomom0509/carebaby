import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { borderTopColor: colors.line, backgroundColor: colors.card },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '홈', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: '캘린더', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="record"
        options={{ title: '기록', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: '내정보', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
