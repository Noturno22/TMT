import { Platform } from 'react-native';

export const Colors = {
  bg: '#000000',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  border: '#38383A',
  text: '#FFFFFF',
  textBody: '#E5E7EB',
  textMuted: '#98989D',
  textFaint: '#636366',
  primary: '#16A43A',
  primaryDim: 'rgba(22,164,58,0.12)',
  accent: '#FF9F0A',
  accentDim: 'rgba(255,159,10,0.10)',
  secondary: '#20A44A',
  success: '#34C759',
  warning: '#FF9F0A',
  destructive: '#FF453A',
  waiting: '#FF9F0A',
  live: '#30D158',
  liveDim: 'rgba(48,209,88,0.12)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const Fonts = {
  display: Platform.select({
    ios: undefined,
    android: 'sans-serif-medium',
    default: undefined,
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;
