import React, { useState } from 'react';
import { View, Modal, Pressable, Alert, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText, AppButton, Divider } from '@/components/ui';
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

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free', icon: 'person-outline' as const, color: Colors.textMuted },
  { value: 'premium', label: 'Premium', icon: 'diamond' as const, color: Colors.accent },
];

const EXPIRY_PRESETS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '1 ano', days: 365 },
];

export function UserDetailModal({ visible, user, onClose, onBan, onRoleChange, onExpiryChange }: UserDetailModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedExpiryDays, setSelectedExpiryDays] = useState<number | null>(null);

  if (!user) return null;

  const isBanned = user.banned === true;
  const role = user.role ?? 'free';
  const avatarColor = isBanned ? Colors.destructive : role === 'premium' ? Colors.accent : Colors.primary;
  const initials = user.email?.charAt(0).toUpperCase() ?? '?';

  const memberSince = new Date(user.created_at).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const lastSeen = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ' ' + new Date(user.last_sign_in_at).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Nunca';

  const daysUntilExpiry = user.subscription_expires
    ? Math.ceil((new Date(user.subscription_expires).getTime() - Date.now()) / 86400000)
    : null;

  const handleBan = async () => {
    const action = isBanned ? 'desbanir' : 'banir';
    Alert.alert(
      isBanned ? 'Desbanir utilizador?' : 'Banir utilizador?',
      isBanned
        ? `O utilizador ${user.email} terá acesso restaurado.`
        : `O utilizador ${user.email} será banido e perderá acesso ao app.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isBanned ? 'Desbanir' : 'Banir',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try { await onBan(user.id); onClose(); } finally { setLoading(false); }
          },
        },
      ],
    );
  };

  const handleRoleChange = async (newRole: string) => {
    if (newRole === role) return;
    Alert.alert(
      `Alterar para ${newRole}?`,
      `O plano do utilizador será alterado de ${role} para ${newRole}.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            try { await onRoleChange(user.id, newRole); onClose(); } finally { setLoading(false); }
          },
        },
      ],
    );
  };

  const handleSetExpiry = async (days: number | null) => {
    const expiresAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const label = days ? `${days} dias` : 'remover expiração';
    Alert.alert(
      `Definir expiração?`,
      `A subscrição expirará ${days ? `em ${label}` : 'nunca'}.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            try { await onExpiryChange(user.id, expiresAt); onClose(); } finally { setLoading(false); }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
          <AppText variant="label" style={{ color: Colors.textMuted }}>{t('admin.userDetails')}</AppText>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: Spacing.xl * 3 }}>
          <View style={styles.heroSection}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <AppText style={styles.avatarText}>{initials}</AppText>
            </View>
            <AppText variant="h1" style={styles.heroEmail} numberOfLines={1}>{user.email}</AppText>

            <View style={styles.heroBadges}>
              <View style={[styles.roleBadgeLarge, role === 'premium' && styles.roleBadgePremium]}>
                <Ionicons name={role === 'premium' ? 'diamond' : 'person'} size={13} color={role === 'premium' ? Colors.accent : Colors.textMuted} />
                <AppText variant="small" style={{ color: role === 'premium' ? Colors.accent : Colors.textMuted, fontWeight: '700' }}>
                  {role.toUpperCase()}
                </AppText>
              </View>
              {isBanned && (
                <View style={styles.bannedBadgeLarge}>
                  <Ionicons name="ban" size={13} color={Colors.destructive} />
                  <AppText variant="small" style={{ color: Colors.destructive, fontWeight: '700' }}>BANIDO</AppText>
                </View>
              )}
              {user.subscription_status && (
                <View style={styles.statusBadgeLarge}>
                  <AppText variant="small" style={{ color: Colors.textMuted, fontWeight: '600' }}>
                    {user.subscription_status}
                  </AppText>
                </View>
              )}
            </View>
          </View>

          <View style={styles.infoSection}>
            <AppText variant="label" style={styles.sectionTitle}>{t('admin.userDetails')}</AppText>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
                  <AppText variant="small" style={{ color: Colors.textMuted }}>{t('admin.registrationDate')}</AppText>
                </View>
                <AppText variant="small" style={{ color: Colors.text }}>{memberSince}</AppText>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                  <AppText variant="small" style={{ color: Colors.textMuted }}>Último acesso</AppText>
                </View>
                <View style={styles.infoRight}>
                  <View style={[styles.onlineDot, { backgroundColor: user.last_sign_in_at ? Colors.live : Colors.textFaint }]} />
                  <AppText variant="small" style={{ color: Colors.text }}>{lastSeen}</AppText>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name="card-outline" size={16} color={Colors.textMuted} />
                  <AppText variant="small" style={{ color: Colors.textMuted }}>{t('admin.subscriptionExpires')}</AppText>
                </View>
                <View style={styles.infoRight}>
                  {user.subscription_expires ? (
                    <>
                      <View style={[styles.expiryDot, { backgroundColor: daysUntilExpiry !== null && daysUntilExpiry < 7 ? Colors.destructive : daysUntilExpiry !== null && daysUntilExpiry < 30 ? Colors.warning : Colors.success }]} />
                      <AppText variant="small" style={{
                        color: daysUntilExpiry !== null && daysUntilExpiry < 7 ? Colors.destructive : Colors.text,
                        fontWeight: daysUntilExpiry !== null && daysUntilExpiry < 7 ? '700' : '400',
                      }}>
                        {new Date(user.subscription_expires).toLocaleDateString('pt-PT')}
                        {daysUntilExpiry !== null && (
                          <AppText variant="small" style={{ color: Colors.textFaint }}> ({daysUntilExpiry}d)</AppText>
                        )}
                      </AppText>
                    </>
                  ) : (
                    <AppText variant="small" style={{ color: Colors.textFaint }}>{t('admin.never')}</AppText>
                  )}
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name="finger-print-outline" size={16} color={Colors.textMuted} />
                  <AppText variant="small" style={{ color: Colors.textMuted }}>ID</AppText>
                </View>
                <AppText variant="mono" style={{ color: Colors.textFaint, fontSize: 11 }}>
                  {user.id.slice(0, 12)}...
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.infoSection}>
            <AppText variant="label" style={styles.sectionTitle}>Plano & Subscrição</AppText>

            <View style={styles.planRow}>
              {PLAN_OPTIONS.map((p) => (
                <Pressable
                  key={p.value}
                  onPress={() => handleRoleChange(p.value)}
                  disabled={loading || role === p.value}
                  style={[
                    styles.planCard,
                    role === p.value && { borderColor: p.color, backgroundColor: `${p.color}15` },
                    role !== p.value && { opacity: 0.6 },
                  ]}
                >
                  <Ionicons name={p.icon} size={22} color={p.color} />
                  <AppText variant="label" style={{ color: p.color }}>{p.label}</AppText>
                  {role === p.value && (
                    <View style={[styles.planCheck, { backgroundColor: p.color }]}>
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            <AppText variant="small" style={{ color: Colors.textMuted, marginBottom: Spacing.sm }}>
              Expiração da subscrição
            </AppText>
            <View style={styles.expiryPresets}>
              {EXPIRY_PRESETS.map((p) => (
                <Pressable
                  key={p.days}
                  onPress={() => setSelectedExpiryDays(p.days)}
                  style={[
                    styles.expiryChip,
                    selectedExpiryDays === p.days
                      ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
                      : { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
                  ]}
                >
                  <AppText variant="small" style={{
                    color: selectedExpiryDays === p.days ? '#1A1A2E' : Colors.textMuted,
                    fontWeight: '600',
                  }}>
                    {p.label}
                  </AppText>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setSelectedExpiryDays(null)}
                style={[
                  styles.expiryChip,
                  selectedExpiryDays === null
                    ? { backgroundColor: Colors.destructive, borderColor: Colors.destructive }
                    : { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
                ]}
              >
                <AppText variant="small" style={{
                  color: selectedExpiryDays === null ? '#FFF' : Colors.textMuted,
                  fontWeight: '600',
                }}>
                  Sem limite
                </AppText>
              </Pressable>
            </View>
            {selectedExpiryDays !== null && (
              <AppButton
                title={`Definir expiração: ${selectedExpiryDays} dias`}
                variant="gold"
                loading={loading}
                onPress={() => handleSetExpiry(selectedExpiryDays)}
                style={{ marginTop: Spacing.sm }}
              />
            )}
            {selectedExpiryDays === null && (
              <AppButton
                title="Remover expiração"
                variant="outline"
                loading={loading}
                onPress={() => handleSetExpiry(null)}
                style={{ marginTop: Spacing.sm }}
              />
            )}
          </View>

          <View style={styles.infoSection}>
            <AppText variant="label" style={[styles.sectionTitle, { color: Colors.destructive }]}>Zona de Perigo</AppText>
            <Pressable
              onPress={handleBan}
              disabled={loading}
              style={styles.dangerCard}
            >
              <View style={styles.dangerLeft}>
                <Ionicons name={isBanned ? 'checkmark-circle-outline' : 'ban-outline'} size={20} color={isBanned ? Colors.success : Colors.destructive} />
                <View>
                  <AppText variant="label" style={{ color: isBanned ? Colors.success : Colors.destructive }}>
                    {isBanned ? 'Remover Ban' : 'Banir Utilizador'}
                  </AppText>
                  <AppText variant="small" style={{ color: Colors.textFaint }}>
                    {isBanned ? 'Restaurar acesso ao app' : 'Bloquear acesso ao app'}
                  </AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textFaint} />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  heroEmail: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  heroBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  roleBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleBadgePremium: {
    backgroundColor: Colors.accentDim,
    borderColor: 'rgba(255,159,10,0.3)',
  },
  bannedBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,69,58,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.3)',
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.md,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  expiryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  planRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  planCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  planCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  expiryPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  expiryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,69,58,0.08)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.2)',
    padding: Spacing.md,
  },
  dangerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
