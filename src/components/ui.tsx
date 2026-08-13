import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius, Spacing } from '@/core/theme';

// ---------- Screen ----------

export function Screen({
  children,
  scroll = true,
  style,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: object;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  const bg = <View style={[styles.screen, style]}>{children}</View>;
  if (!scroll) return <SafeAreaView style={styles.safe}>{bg}</SafeAreaView>;
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {bg}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Text ----------

type TextVariant = 'title' | 'h1' | 'h2' | 'label' | 'muted' | 'mono' | 'small' | 'body';

export function AppText({
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: TextVariant }) {
  const variantStyle = variantStyles[variant];
  return <Text style={[styles.text, variantStyle, style]} {...props} />;
}

// ---------- Card ----------

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------- Button ----------

type ButtonVariant = 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
  icon?: ReactNode;
}) {
  const palette = buttonVariants[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (pressed || isDisabled) && { opacity: isDisabled ? 0.5 : 0.85 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {icon}
          <AppText style={[styles.buttonText, { color: palette.text }]}>{title}</AppText>
        </>
      )}
    </Pressable>
  );
}

// ---------- Badge ----------

export function Badge({
  children,
  color,
  bg,
  style,
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
  style?: object;
}) {
  return (
    <View style={[styles.badge, { borderColor: color ?? Colors.textMuted, backgroundColor: bg ?? `${color ?? Colors.textMuted}20` }, style]}>
      <AppText variant="small" style={{ color: color ?? Colors.textMuted, fontWeight: '700' }}>
        {children}
      </AppText>
    </View>
  );
}

// ---------- ConfidenceBar ----------

export function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? Colors.success : value >= 60 ? Colors.warning : Colors.textMuted;
  return (
    <View style={styles.confRow}>
      <View style={styles.confTrack}>
        <View style={[styles.confFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
      </View>
      <AppText variant="small" style={[styles.confValue, { color }]}>
        {value}%
      </AppText>
    </View>
  );
}

// ---------- Chip ----------

export function Chip({
  label,
  active,
  onPress,
  locked,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  locked?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      style={[
        styles.chip,
        active
          ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
          : { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
        locked && { opacity: 0.4 },
      ]}>
      <AppText
        variant="small"
        style={{ color: active ? '#1A1A2E' : Colors.textMuted, fontWeight: '600' }}>
        {locked ? `🔒 ${label}` : label}
      </AppText>
    </Pressable>
  );
}

// ---------- Spinner / EmptyState / Section ----------

export function Spinner({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {label ? <AppText variant="muted" style={{ marginTop: Spacing.md }}>{label}</AppText> : null}
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={[styles.center, { paddingVertical: Spacing.xl * 2 }]}>
      <AppText variant="h2" style={{ textAlign: 'center' }}>{title}</AppText>
      {subtitle ? (
        <AppText variant="muted" style={{ textAlign: 'center', marginTop: Spacing.sm }}>{subtitle}</AppText>
      ) : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <AppText variant="h2">{children}</AppText>
      {right}
    </View>
  );
}

export function Divider({ style }: { style?: object }) {
  return <View style={[styles.divider, style]} />;
}

// ---------- Input ----------

export function AppInput(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={styles.inputWrap}>
      {label ? (
        <AppText variant="label" style={{ marginBottom: Spacing.xs }}>{label}</AppText>
      ) : null}
      <TextInput
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  screen: { flex: 1, padding: 20 },
  text: { color: Colors.textBody, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    minHeight: 48,
  },
  buttonText: { fontSize: 14, fontWeight: '600' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  confTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.surfaceElevated, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 4 },
  confValue: { fontWeight: '700', minWidth: 40, textAlign: 'right' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  inputWrap: { marginBottom: Spacing.md },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
  },
});

const variantStyles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  h1: { fontSize: 22, fontWeight: '800', color: Colors.text },
  h2: { fontSize: 17, fontWeight: '700', color: Colors.text },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text },
  muted: { fontSize: 13, color: Colors.textMuted },
  small: { fontSize: 12 },
  mono: { fontFamily: Fonts.mono, fontSize: 14 },
  body: { fontSize: 14, lineHeight: 20 },
});

const buttonVariants: Record<ButtonVariant, { bg: string; border: string; text: string }> = {
  primary: { bg: Colors.primary, border: Colors.primary, text: '#FFFFFF' },
  gold: { bg: Colors.accent, border: Colors.accent, text: '#1A1A2E' },
  secondary: { bg: 'transparent', border: Colors.accent, text: Colors.accent },
  ghost: { bg: 'transparent', border: 'transparent', text: Colors.textMuted },
  danger: { bg: Colors.destructive, border: Colors.destructive, text: '#FFFFFF' },
  outline: { bg: 'transparent', border: Colors.border, text: Colors.text },
};

export { Fonts };
