import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth-context';
import { ThemeProvider, useTheme } from '../lib/theme-context';

function ThemedStack() {
  const { resolvedScheme, colors } = useTheme();
  return (
    <>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
