// ========================================
// PALETTE DE COULEURS QNOOK
// ========================================

export const colors = {
  // Primaires
  primary: '#0066FF',
  primaryDark: '#0052CC',
  primaryVeryDark: '#0040CC',
  primaryLight: '#F0F4FF',
  primaryVeryLight: '#F8FAFF',

  // Backgrounds
  dark: '#1A1A2E',
  darkLight: '#2D2E47',
  light: '#F5F5F7',
  white: '#FFFFFF',

  // Secondaires
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#FF8C42',
  warningLight: '#FFF5EB',
  error: '#EF4444',
  errorLight: '#FEF2F2',

  // Textes
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textWhite: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};

// Gradients
export const gradients = {
  welcomeScreen: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
  sessionActive: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.darkLight} 100%)`,
  card: `linear-gradient(135deg, ${colors.white} 0%, ${colors.light} 100%)`,
};

// Shadows
export const shadows = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
  sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
  md: '0 4px 12px rgba(0, 0, 0, 0.12)',
  lg: '0 8px 24px rgba(0, 102, 255, 0.15)',
  xl: '0 12px 32px rgba(0, 0, 0, 0.15)',
  blue: `0 4px 12px rgba(0, 102, 255, 0.3)`,
  blueHover: `0 8px 20px rgba(0, 102, 255, 0.4)`,
};

// Transitions
export const transitions = {
  fast: '0.15s ease-in-out',
  base: '0.3s ease',
  slow: '0.5s ease-in-out',
};

// Spacing
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
};

// Border Radius
export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
};

export default {
  colors,
  gradients,
  shadows,
  transitions,
  spacing,
  borderRadius,
};
