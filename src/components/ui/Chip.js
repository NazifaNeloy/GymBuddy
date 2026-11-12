import { Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

/** Pill-shaped toggle or tag. Pass onPress to make it a toggle (filter chip). */
export function Chip({ label, selected = false, onPress, testID, style }) {
  const theme = useTheme();
  const { colors, radius, spacing } = theme;
  const content = (
    <AppText variant="label" color={selected ? 'onPrimary' : 'text'}>
      {label}
    </AppText>
  );
  const chipStyle = ({ pressed } = {}) => [
    {
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: selected ? colors.primary : colors.borderStrong,
      backgroundColor: selected ? colors.primary : pressed ? colors.surfaceAlt : colors.surface,
      marginRight: spacing.sm,
      marginBottom: spacing.sm,
    },
    style,
  ];

  if (!onPress) {
    return (
      <Pressable disabled style={chipStyle()} testID={testID}>
        {content}
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={6}
      style={chipStyle}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}
