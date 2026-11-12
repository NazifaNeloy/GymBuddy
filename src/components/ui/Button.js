import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

/**
 * variant: primary | secondary | ghost
 * While `loading`, the button is disabled and shows a spinner (and reports busy to screen readers).
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityHint,
  testID,
  style,
}) {
  const theme = useTheme();
  const { colors, radius, spacing, hitTarget } = theme;
  const isDisabled = disabled || loading;

  const variants = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: 'onPrimary', border: colors.primary },
    secondary: { bg: colors.surface, pressed: colors.surfaceAlt, fg: 'text', border: colors.borderStrong },
    ghost: { bg: 'transparent', pressed: colors.surfaceAlt, fg: 'primary', border: 'transparent' },
  };
  const v = variants[variant] ?? variants.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: hitTarget,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: pressed ? v.pressed : v.bg,
          borderColor: v.border,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={colors[v.fg]} style={{ marginRight: spacing.sm }} />
        ) : null}
        <AppText variant="label" color={v.fg}>
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
