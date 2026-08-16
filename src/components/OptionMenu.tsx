import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';

export interface OptionMenuOption {
  label: string;
  value: string;
  locked?: boolean;
}

export function OptionMenu({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: OptionMenuOption[];
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <AppText variant="small" style={styles.label}>{label}</AppText>
        <AppText variant="label" style={styles.value} numberOfLines={1}>
          {selected?.label}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <AppText variant="h2" style={styles.sheetTitle}>{label}</AppText>
          <View style={styles.options}>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  disabled={opt.locked}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}>
                  <AppText
                    variant="label"
                    style={[styles.optionText, active && styles.optionTextActive]}>
                    {opt.locked ? `${t('components.ui.lockedPrefix')}${opt.label}` : opt.label}
                  </AppText>
                  {active ? <Ionicons name="checkmark" size={18} color={Colors.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  label: { color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  value: { flex: 1, textAlign: 'right', color: Colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderColor: Colors.border,
    borderWidth: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + Spacing.lg,
    gap: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  sheetTitle: { textAlign: 'center' },
  options: { gap: Spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionActive: {
    backgroundColor: Colors.accentDim,
    borderColor: `${Colors.accent}40`,
  },
  optionText: { color: Colors.textBody },
  optionTextActive: { color: Colors.accent, fontWeight: '800' },
});
