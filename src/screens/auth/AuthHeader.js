import { View } from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { useTheme } from '../../theme/ThemeProvider';

export function AuthHeader({ title, subtitle, showBrand = false }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.xl }}>
      {showBrand ? (
        <AppText variant="label" color="primary" accessibilityRole="header" style={{ marginBottom: theme.spacing.sm }}>
          GymBuddy
        </AppText>
      ) : null}
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? (
        <AppText color="textMuted" style={{ marginTop: theme.spacing.xs }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
