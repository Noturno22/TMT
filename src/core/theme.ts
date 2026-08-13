import { Platform } from 'react-native';

export const Colors = {
  bg: '#0A0A14',
  surface: '#1A1A2E',
  surfaceElevated: '#1F2937',
  border: '#2C2C5E',
  text: '#FFFFFF',
  textBody: '#E5E7EB',
  textMuted: '#9CA3AF',
  textFaint: '#6B7280',
  primary: '#16A43A',
  primaryDim: 'rgba(22,164,58,0.12)',
  accent: '#FFC915',
  accentDim: 'rgba(255,201,21,0.10)',
  secondary: '#108BB1',
  success: '#16A43A',
  warning: '#FFC915',
  destructive: '#EF4444',
  waiting: '#FFC915',
  live: '#0BDF19',
  liveDim: 'rgba(11,223,25,0.12)',
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
