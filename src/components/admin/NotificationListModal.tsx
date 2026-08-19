import React from 'react';
import { View, FlatList, Pressable, Modal, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';
import { AdminNotification } from '@/core/types';

interface NotificationListModalProps {
  visible: boolean;
  notifications: AdminNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  receipt_pending: 'receipt-outline',
  receipt_approved: 'checkmark-circle-outline',
  receipt_rejected: 'close-circle-outline',
  signal_closed: 'trending-down',
  signal_tp: 'checkmark-done-outline',
  signal_sl: 'close-outline',
  new_user: 'person-add-outline',
  subscription_expired: 'card-outline',
  subscription_expiring: 'time-outline',
  system_error: 'alert-circle-outline',
};

export function NotificationListModal({ visible, notifications, onClose, onMarkRead, onMarkAllRead }: NotificationListModalProps) {
  const { t } = useTranslation();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="h2">{t('admin.notifications')}</AppText>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <Pressable onPress={onMarkAllRead} style={styles.markAllBtn}>
                <AppText variant="small" style={styles.markAllText}>{t('admin.markAllRead')}</AppText>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => onMarkRead(item.id)} style={[styles.item, !item.read && styles.itemUnread]}>
              <Ionicons name={TYPE_ICONS[item.type] ?? 'notifications-outline'} size={20} color={!item.read ? Colors.primary : Colors.textMuted} />
              <View style={styles.itemContent}>
                <AppText variant="label" style={[!item.read && styles.itemTitleUnread]}>{item.title}</AppText>
                <AppText variant="small" style={styles.itemMessage} numberOfLines={2}>{item.message}</AppText>
                <AppText variant="small" style={styles.itemTime}>{new Date(item.created_at).toLocaleString()}</AppText>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.textFaint} />
              <AppText variant="muted">{t('admin.noNotifications')}</AppText>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  markAllBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm, backgroundColor: Colors.primary },
  markAllText: { color: '#FFFFFF' },
  closeBtn: { padding: Spacing.xs },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md,
    gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  itemUnread: { backgroundColor: Colors.surface },
  itemContent: { flex: 1, gap: 2 },
  itemTitleUnread: { fontWeight: '600' },
  itemMessage: { color: Colors.textBody },
  itemTime: { color: Colors.textFaint, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 100 },
});
