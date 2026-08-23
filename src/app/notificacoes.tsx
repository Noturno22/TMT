import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppButton, AppText, Badge, Card, EmptyState, Screen, Spinner } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  clearPlanRequests,
  getPlanRequests,
  pruneExpiredPlanRequests,
  removePlanRequest,
  type PlanRequestEntry,
} from '@/lib/planRequests';
import {
  clearUserNotifications,
  deleteUserNotification,
  fetchUserNotifications,
  markAllUserNotificationsRead,
} from '@/lib/userNotifications';
import { formatShortDate } from '@/core/format';

interface NotifItem {
  identifier: string;
  title: string;
  body: string;
  fireAt: Date | null;
  createdAt?: Date;
  kind: 'boom' | 'plan' | 'other';
  source: 'remote' | 'plan-request' | 'local';
}

function getFireDate(trigger: Notifications.NotificationTrigger): Date | null {
  if (!trigger || typeof trigger !== 'object') return null;
  if ('type' in trigger && trigger.type === 'date' && 'date' in trigger) {
    return new Date(trigger.date);
  }
  return null;
}

function kindOf(item: { title: string | null; data?: unknown }): NotifItem['kind'] {
  const d = item.data as { kind?: unknown } | undefined;
  if (d?.kind === 'plan') return 'plan';
  if (!item.title) return 'other';
  if (/boom|alarme/i.test(item.title)) return 'boom';
  if (/premium|plano|oferta|pedido/i.test(item.title)) return 'plan';
  return 'other';
}

function formatFire(fireAt: Date | null, t: TFunction): string {
  if (!fireAt) return t('notificacoes.soon');
  const diff = fireAt.getTime() - Date.now();
  if (diff <= 0) return t('notificacoes.delivered');
  const mins = Math.ceil(diff / 60_000);
  if (mins < 60) return t('notificacoes.inMin', { count: mins });
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return t('notificacoes.inHm', { h: hh, min: mm });
}

const KIND_STYLE: Record<NotifItem['kind'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  boom: { icon: 'alarm', color: Colors.accent },
  plan: { icon: 'sparkles', color: Colors.primary },
  other: { icon: 'notifications-outline', color: Colors.textMuted },
};

export default function NotificacoesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<NotifItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<NotifItem[]> => {
    await pruneExpiredPlanRequests().catch(() => {});
    const [scheduled, planRequests, remote] = await Promise.all([
      Notifications.getAllScheduledNotificationsAsync(),
      getPlanRequests().catch(() => [] as PlanRequestEntry[]),
      fetchUserNotifications(30).catch(() => []),
    ]);
    const scheduledItems: NotifItem[] = scheduled.map((n) => ({
      identifier: n.identifier,
      title: n.content.title ?? t('notificacoes.title'),
      body: n.content.body ?? '',
      fireAt: getFireDate(n.trigger),
      kind: kindOf(n.content),
      source: 'local',
    }));
    const planItems: NotifItem[] = planRequests.map((p) => ({
      identifier: p.id,
      title: p.title,
      body: p.body,
      fireAt: null,
      createdAt: new Date(p.createdAt),
      kind: 'plan',
      source: 'plan-request',
    }));
    const remoteItems: NotifItem[] = remote.map((n) => ({
      identifier: n.id,
      title: n.title,
      body: n.body,
      fireAt: null,
      createdAt: new Date(n.created_at),
      kind: n.kind === 'plan' ? 'plan' : 'other',
      source: 'remote',
    }));
    return [...remoteItems, ...planItems, ...scheduledItems].sort(
      (a, b) =>
        (b.createdAt?.getTime() ?? b.fireAt?.getTime() ?? Infinity) -
        (a.createdAt?.getTime() ?? a.fireAt?.getTime() ?? Infinity),
    );
  }, [t]);

  useEffect(() => {
    load().then(setItems).catch(() => setItems([]));
    // Ao abrir a caixa de entrada, tudo conta como lido (limpa o sino).
    markAllUserNotificationsRead().catch(() => {});
  }, [load]);

  const remove = async (identifier: string) => {
    setBusyId(identifier);
    try {
      const item = items?.find((i) => i.identifier === identifier);
      if (item?.source === 'remote') {
        await deleteUserNotification(identifier).catch(() => {});
      } else if (identifier.startsWith('plan-request-')) {
        await removePlanRequest(identifier);
      } else {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      }
      setItems(await load());
    } finally {
      setBusyId(null);
    }
  };

  const clearAll = async () => {
    setBusyId('all');
    try {
      await Promise.all([
        Notifications.cancelAllScheduledNotificationsAsync(),
        clearPlanRequests().catch(() => {}),
        clearUserNotifications().catch(() => {}),
      ]);
      setItems(await load());
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      {items === null ? (
        <Spinner label={t('notificacoes.loading')} />
      ) : items.length === 0 ? (
        <>
          <EmptyState
            title={t('notificacoes.emptyTitle')}
            subtitle={t('notificacoes.emptyBody')}
          />
          <AppButton
            title={t('notificacoes.enableAlarms')}
            variant="secondary"
            icon={<Ionicons name="alarm-outline" size={18} color={Colors.accent} />}
            onPress={() => router.push('/(tabs)/horarios')}
          />
        </>
      ) : (
        <>
          <View style={styles.list}>
            {items.map((item) => {
              const s = KIND_STYLE[item.kind];
              const busy = busyId === item.identifier;
              const isPendingPlan = item.source === 'plan-request';
              return (
                <Card key={item.identifier} style={styles.row}>
                  <View style={[styles.iconWrap, { borderColor: `${s.color}40`, backgroundColor: `${s.color}14` }]}>
                    <Ionicons name={s.icon} size={20} color={s.color} />
                  </View>
                  <View style={styles.rowBody}>
                    <AppText variant="label">{item.title}</AppText>
                    {item.body ? (
                      <AppText variant="small" style={{ color: Colors.textMuted }}>{item.body}</AppText>
                    ) : null}
                    <AppText variant="small" style={{ color: Colors.textFaint }}>
                      {isPendingPlan
                        ? t('notificacoes.planProcessing')
                        : item.source === 'remote' && item.createdAt
                          ? formatShortDate(item.createdAt.toISOString())
                          : formatFire(item.fireAt, t)}
                    </AppText>
                  </View>
                  {isPendingPlan ? (
                    <Badge color={Colors.warning} bg={`${Colors.warning}20`}>
                      {t('notificacoes.planPending')}
                    </Badge>
                  ) : (
                    <Pressable onPress={() => remove(item.identifier)} disabled={busy} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={busy ? Colors.textFaint : Colors.textMuted} />
                    </Pressable>
                  )}
                </Card>
              );
            })}
          </View>

          <AppButton
            title={t('notificacoes.manageAlerts')}
            variant="secondary"
            icon={<Ionicons name="alarm-outline" size={18} color={Colors.accent} />}
            onPress={() => router.push('/(tabs)/horarios')}
            style={{ marginBottom: Spacing.sm }}
          />
          <AppButton
            title={t('notificacoes.clearAll')}
            variant="ghost"
            loading={busyId === 'all'}
            icon={<Ionicons name="trash-outline" size={18} color={Colors.textMuted} />}
            onPress={clearAll}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm, marginBottom: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
});
