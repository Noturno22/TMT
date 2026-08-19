import React from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';
import { FilterConfig } from '@/hooks/useAdminSearch';

interface FilterChipsProps {
  filters: FilterConfig[];
  activeFilters: string[];
  onToggle: (filter: string) => void;
  onClear: () => void;
}

export function FilterChips({ filters, activeFilters, onToggle, onClear }: FilterChipsProps) {
  const { t } = useTranslation();

  if (filters.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {activeFilters.length > 0 && (
        <Pressable onPress={onClear} style={[styles.chip, styles.clearChip]}>
          <AppText variant="small" style={styles.clearText}>
            {t('admin.clearFilters')}
          </AppText>
        </Pressable>
      )}
      {filters.map((filter) => {
        const isActive = activeFilters.includes(filter.value);
        return (
          <Pressable
            key={filter.key}
            onPress={() => onToggle(filter.value)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <AppText
              variant="small"
              style={[styles.chipText, isActive && styles.chipTextActive]}
            >
              {filter.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  content: {
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  clearChip: {
    backgroundColor: Colors.surfaceElevated,
  },
  clearText: {
    color: Colors.destructive,
  },
});
