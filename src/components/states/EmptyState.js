import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';

export function EmptyState({ title, message, actionLabel, onAction, testID = 'empty-state' }) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { padding: theme.spacing.xl }]} testID={testID}>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText color="textMuted" align="center" style={{ marginTop: theme.spacing.sm, maxWidth: theme.layout.formMaxWidth }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: theme.spacing.xl, minWidth: 160 }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
