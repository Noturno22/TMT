import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Spacing } from '@/core/theme';

export function GradientCard({
  children,
  colors,
  start,
  end,
  style,
}: {
  children: ReactNode;
  colors?: readonly [string, string];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: object;
}) {
  return (
    <LinearGradient
      colors={colors ?? [Colors.surface, 'rgba(255,255,255,0.06)']}
      start={start ?? { x: 0, y: 0 }}
      end={end ?? { x: 1, y: 1 }}
      style={[styles.card, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
});
