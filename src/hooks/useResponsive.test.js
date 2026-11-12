import { getResponsiveInfo } from './useResponsive';

describe('getResponsiveInfo', () => {
  it('treats a typical phone as one column', () => {
    const info = getResponsiveInfo(390, 844);
    expect(info).toMatchObject({ isTablet: false, isLandscape: false, columns: 1, gutter: 16 });
  });

  it('treats a phone in landscape as a phone, but gives it two columns', () => {
    expect(getResponsiveInfo(844, 390)).toMatchObject({ isTablet: false, isLandscape: true, columns: 2 });
  });

  it('treats a 7-inch tablet as a tablet', () => {
    expect(getResponsiveInfo(600, 960).isTablet).toBe(true);
  });

  it('treats a tablet as two columns, large tablets as three', () => {
    expect(getResponsiveInfo(820, 1180)).toMatchObject({ isTablet: true, columns: 2, gutter: 32 });
    expect(getResponsiveInfo(1180, 820)).toMatchObject({ isTablet: true, isLandscape: true, columns: 3 });
  });
});
