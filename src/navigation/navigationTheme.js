import { DarkTheme, DefaultTheme } from '@react-navigation/native';

/** Map our theme tokens onto React Navigation's theme (headers, cards, tab bars). */
export function toNavigationTheme(theme) {
  const base = theme.isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.background,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  };
}
