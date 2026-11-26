import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

/** Compact −/+ number control. Screen readers can swipe up/down to adjust. */
export function Stepper({ label, value, onChange, step = 1, min = 0, max = 999, format = String, testID, style }) {
  const theme = useTheme();
  const { colors, radius, spacing, hitTarget } = theme;
  const change = (delta) => onChange(Math.min(max, Math.max(min, value + delta)));

  const button = (symbol, delta, disabled, name) => (
    <Pressable
      onPress={() => change(delta)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${name} ${label}`}
      hitSlop={4}
      testID={testID ? `${testID}-${delta > 0 ? 'inc' : 'dec'}` : undefined}
      style={({ pressed }) => [
        styles.button,
        {
          width: hitTarget - 8,
          height: hitTarget - 8,
          borderRadius: radius.md,
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
          borderColor: colors.borderStrong,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <AppText variant="heading">{symbol}</AppText>
    </Pressable>
  );

  return (
    <View
      style={[{ marginRight: spacing.md, marginBottom: spacing.sm }, style]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => change(e.nativeEvent.actionName === 'increment' ? step : -step)}
    >
      <AppText variant="caption" color="textMuted" style={{ marginBottom: spacing.xxs }}>
        {label}
      </AppText>
      <View style={styles.row}>
        {button('−', -step, value <= min, 'Decrease')}
        <AppText variant="label" style={[styles.value, { minWidth: 44 }]} testID={testID ? `${testID}-value` : undefined}>
          {format(value)}
        </AppText>
        {button('+', step, value >= max, 'Increase')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  button: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  value: { textAlign: 'center' },
});
