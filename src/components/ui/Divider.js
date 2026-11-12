import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

export function Divider({ label }) {
  const theme = useTheme();
  const line = <View style={[styles.line, { backgroundColor: theme.colors.border }]} />;
  return (
    <View style={[styles.row, { marginVertical: theme.spacing.lg }]}>
      {line}
      {label ? (
        <AppText variant="caption" color="textMuted" style={{ marginHorizontal: theme.spacing.md }}>
          {label}
        </AppText>
      ) : null}
      {line}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
