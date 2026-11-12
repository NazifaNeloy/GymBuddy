import { useWindowDimensions } from 'react-native';
import { layout } from '../theme/spacing';

/** Pure helper so layout rules can be unit-tested without rendering. */
export function getResponsiveInfo(width, height) {
  // Device class depends on the shortest side, so rotating a phone never makes it a "tablet".
  const isTablet = Math.min(width, height) >= layout.tabletShortestSide;
  return {
    width,
    height,
    isTablet,
    isLandscape: width > height,
    // Number of columns for grids/lists of cards.
    columns: width >= 1100 ? 3 : width >= layout.twoColumnWidth ? 2 : 1,
    // Horizontal padding grows a little on large screens.
    gutter: isTablet ? 32 : 16,
  };
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return getResponsiveInfo(width, height);
}
