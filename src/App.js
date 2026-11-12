import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSyncEngine } from './hooks/useSyncEngine';
import { useAuthDeepLinks } from './navigation/linking';
import { toNavigationTheme } from './navigation/navigationTheme';
import { RootNavigator } from './navigation/RootNavigator';
import { useAuthStore } from './store/authStore';
import { useExerciseStore } from './store/exerciseStore';
import { useRoutineStore } from './store/routineStore';
import { useSyncStore } from './store/syncStore';
import * as syncQueue from './services/sync/queue';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';

function AppContent() {
  const theme = useTheme();
  const init = useAuthStore((s) => s.init);
  const authStatus = useAuthStore((s) => s.status);

  useEffect(() => {
    init();
  }, [init]);

  // Local data belongs to the signed-in user, so drop it when they sign out.
  useEffect(() => {
    if (authStatus !== 'signedOut') return;
    useExerciseStore.getState().reset();
    useRoutineStore.getState().reset();
    useSyncStore.getState().reset();
    syncQueue.clear();
  }, [authStatus]);

  useSyncEngine(authStatus === 'signedIn');
  useAuthDeepLinks();

  return (
    <NavigationContainer theme={toNavigationTheme(theme)}>
      <RootNavigator />
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Theme preference becomes user-selectable in Settings (later step). */}
      <ThemeProvider preference="system">
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
