import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Temporary shell. Navigation, theme and the sync engine are added in later steps.
export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.container} testID="app-root">
        <Text accessibilityRole="header">GymBuddy</Text>
        <StatusBar style="auto" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
