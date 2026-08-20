import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { ChannelRow } from '@/components/community/ChannelRow';
import { Colors, Radius, Spacing } from '@/core/theme';
import type { Channel } from '@/core/types';

export function ChannelPickerModal({
  visible,
  channels,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  channels: Channel[];
  onSelect: (channelId: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <AppText variant="label" style={styles.title}>
          {t('workspace.sendTo')}
        </AppText>
        <FlatList
          data={channels}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ChannelRow channel={item} onPress={() => onSelect(item.id)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
        />
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <Ionicons name="close" size={20} color={Colors.textMuted} />
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('common.cancel')}</AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    maxHeight: '60%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  list: { paddingHorizontal: Spacing.md },
  sep: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
