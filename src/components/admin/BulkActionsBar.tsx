import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
}

export function BulkActionsBar({ selectedCount, onDelete, onCancel }: BulkActionsBarProps) {
  const { t } = useTranslation();
  if (selectedCount === 0) return null;

  return (
    <View style={styles.container}>
      <AppText variant="small" style={styles.count}>
        {t('admin.selectedCount', { count: selectedCount })}
      </AppText>
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <AppText variant="small" style={styles.cancelText}>{t('common.cancel')}</AppText>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
          <AppText variant="small" style={styles.deleteText}>{t('admin.deleteSelected')}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  count: { color: Colors.text, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderRadius: Radius.sm, backgroundColor: Colors.surfaceElevated,
  },
  cancelText: { color: Colors.textMuted },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderRadius: Radius.sm, backgroundColor: Colors.destructive,
  },
  deleteText: { color: '#FFFFFF' },
});
