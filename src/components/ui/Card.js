import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

/** Surface container. With onPress it becomes a pressable card (role "button"). */
export function Card({ children, onPress, accessibilityLabel, accessibilityHint, testID, style }) {
  const theme = useTheme();
  const { colors, radius, spacing } = theme;
  const base = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  };

  if (!onPress) {
    return (
      <View style={[base, style]} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [base, pressed && { backgroundColor: colors.surfaceAlt }, style]}
    >
      {children}
    </Pressable>
  );
}
