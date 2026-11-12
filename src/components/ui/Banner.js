import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

/** Inline message box. tone: error | success | info | warning */
export function Banner({ tone = 'info', title, message, testID, style }) {
  const theme = useTheme();
  const { colors, radius, spacing } = theme;
  const tones = {
    error: { bg: colors.dangerSoft, fg: 'danger' },
    success: { bg: colors.successSoft, fg: 'success' },
    warning: { bg: colors.warningSoft, fg: 'warning' },
    info: { bg: colors.primarySoft, fg: 'primary' },
  };
  const t = tones[tone] ?? tones.info;
  if (!title && !message) return null;

  return (
    <View
      testID={testID}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[{ backgroundColor: t.bg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg }, style]}
    >
      {title ? (
        <AppText variant="label" color={t.fg}>
          {title}
        </AppText>
      ) : null}
      {message ? (
        <AppText variant="caption" color={t.fg} style={title ? { marginTop: spacing.xxs } : null}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}
