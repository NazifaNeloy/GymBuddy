import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors } from './colors';
import { hitTarget, layout, radius, spacing } from './spacing';
import { typography } from './typography';

export function buildTheme(scheme) {
  const isDark = scheme === 'dark';
  return {
    scheme: isDark ? 'dark' : 'light',
    isDark,
    colors: isDark ? darkColors : lightColors,
    spacing,
    radius,
    layout,
    hitTarget,
    typography,
  };
}

/** Resolve a user preference ('system' | 'light' | 'dark') against the OS setting. */
export function resolveScheme(preference, systemScheme) {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

const ThemeContext = createContext(buildTheme('light'));

export function ThemeProvider({ preference = 'system', children }) {
  const systemScheme = useColorScheme();
  const scheme = resolveScheme(preference, systemScheme);
  const theme = useMemo(() => buildTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
