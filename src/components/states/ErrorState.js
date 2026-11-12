import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
  testID = 'error-state',
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background, padding: theme.spacing.xl }]}
      testID={testID}
      accessibilityRole="alert"
    >
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText color="textMuted" align="center" style={{ marginTop: theme.spacing.sm, maxWidth: theme.layout.formMaxWidth }}>
        {message}
      </AppText>
      {onRetry ? (
        <Button title={retryLabel} onPress={onRetry} style={{ marginTop: theme.spacing.xl, minWidth: 160 }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
