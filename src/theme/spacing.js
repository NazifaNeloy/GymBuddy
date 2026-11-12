// 4-point spacing scale and shared layout limits.
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 };

// Content max widths (not screen widths): keep forms and lists readable on tablets.
export const layout = {
  formMaxWidth: 480,
  contentMaxWidth: 960,
  tabletShortestSide: 600, // Android "sw600dp": 7-inch tablets and up
  twoColumnWidth: 768, // switch lists/grids to two columns at this window width
};

// Minimum touch target recommended by Android/iOS accessibility guidelines.
export const hitTarget = 48;
