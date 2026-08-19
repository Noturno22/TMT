import React, { useState } from 'react';
import { View, Modal, Pressable, Alert, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText, AppButton } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';
import { UserWithSubscription } from '@/core/types';

interface UserDetailModalProps {
  visible: boolean;
  user: UserWithSubscription | null;
  onClose: () => void;
  onBan: (userId: string) => Promise<void>;
  onRoleChange: (userId: string, role: string) => Promise<void>;
  onExpiryChange: (userId: string, expiresAt: string | null) => Promise<void>;
}

export function UserDetailModal({ visible, user, onClose, onBan, onRoleChange, onExpiryChange }: UserDetailModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleBan = async () => {
    Alert.alert(t('common.confirm'), t('admin.banUser') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'), style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try { await onBan(user.id); onClose(); } finally { setLoading(false); }
        },
      },
    ]);
  };

  const handleRoleToggle = async () => {
    const newRole = user.role === 'premium' ? 'free' : 'premium';
    setLoading(true);
    try { await onRoleChange(user.id, newRole); onClose(); } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="h2">{t('admin.userDetails')}</AppText>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.body}>
          <View style={styles.avatar}>
            <AppText variant="h1" style={styles.avatarText}>
              {user.email?.charAt(0).toUpperCase() ?? '?'}
            </AppText>
          </View>

          <AppText variant="label" style={styles.email}>{user.email}</AppText>

          <View style={styles.infoRow}>
            <AppText variant="muted">{t('admin.registrationDate')}</AppText>
            <AppText variant="small">{new Date(user.created_at).toLocaleDateString()}</AppText>
          </View>

          <View style={styles.infoRow}>
            <AppText variant="muted">{t('admin.currentPlan')}</AppText>
            <View style={[styles.roleBadge, user.role === 'premium' && styles.premiumBadge]}>
              <AppText variant="small" style={[styles.roleText, user.role === 'premium' && styles.premiumText]}>
                {user.role ?? 'free'}
              </AppText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <AppText variant="muted">{t('admin.subscriptionExpires')}</AppText>
            <AppText variant="small">
              {user.subscription_expires
                ? new Date(user.subscription_expires).toLocaleDateString()
                : t('admin.never')}
            </AppText>
          </View>

          <View style={styles.actions}>
            <AppButton
              title={user.role === 'premium' ? t('admin.removePremium') : t('admin.makePremium')}
              variant={user.role === 'premium' ? 'outline' : 'primary'}
              onPress={handleRoleToggle}
              disabled={loading}
            />
            <AppButton title={t('admin.banUser')} variant="danger" onPress={handleBan} disabled={loading} />
          </View>
        </ScrollView>
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
  body: { padding: Spacing.md },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.md,
  },
  avatarText: { color: '#FFFFFF', fontSize: 24 },
  email: { textAlign: 'center', marginBottom: Spacing.lg },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  roleBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, backgroundColor: Colors.surface },
  premiumBadge: { backgroundColor: Colors.accent },
  roleText: { color: Colors.textMuted },
  premiumText: { color: '#FFFFFF' },
  actions: { gap: Spacing.sm, marginTop: Spacing.lg },
});
