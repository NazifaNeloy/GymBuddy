import { buildTheme, resolveScheme } from './ThemeProvider';
import { darkColors, lightColors } from './colors';

describe('resolveScheme', () => {
  it('follows the system when preference is system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
  });

  it('lets an explicit preference override the system', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });
});

describe('buildTheme', () => {
  it('returns matching palettes', () => {
    expect(buildTheme('dark').colors).toBe(darkColors);
    expect(buildTheme('light').colors).toBe(lightColors);
  });

  it('light and dark palettes define the same tokens', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });
});
