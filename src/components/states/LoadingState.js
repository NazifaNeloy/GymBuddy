import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';

export function LoadingState({ message = 'Loading…', testID = 'loading-state' }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background, padding: theme.spacing.xl }]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <AppText color="textMuted" style={{ marginTop: theme.spacing.md }}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
