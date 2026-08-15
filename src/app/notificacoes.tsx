import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppButton, AppText, Card, EmptyState, Screen, Spinner } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

interface NotifItem {
  identifier: string;
  title: string;
  body: string;
  fireAt: Date | null;
  kind: 'boom' | 'plan' | 'other';
}

function getFireDate(trigger: Notifications.NotificationTrigger): Date | null {
  if (!trigger || typeof trigger !== 'object') return null;
  if ('type' in trigger && trigger.type === 'date' && 'date' in trigger) {
    return new Date(trigger.date);
  }
  return null;
}

function kindOf(title: string | null): NotifItem['kind'] {
  if (!title) return 'other';
  if (/boom|alarme/i.test(title)) return 'boom';
  if (/premium|plano|oferta/i.test(title)) return 'plan';
  return 'other';
}

function formatFire(fireAt: Date | null): string {
  if (!fireAt) return 'Em breve';
  const diff = fireAt.getTime() - Date.now();
  if (diff <= 0) return 'Entregue';
  const mins = Math.ceil(diff / 60_000);
  if (mins < 60) return `Em ${mins} min`;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return mm > 0 ? `Em ${hh}h${String(mm).padStart(2, '0')}` : `Em ${hh}h`;
}

const KIND_STYLE: Record<NotifItem['kind'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  boom: { icon: 'alarm', color: Colors.accent },
  plan: { icon: 'sparkles', color: Colors.primary },
  other: { icon: 'notifications-outline', color: Colors.textMuted },
};

export default function NotificacoesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotifItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<NotifItem[]> => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled
      .map((n) => ({
        identifier: n.identifier,
        title: n.content.title ?? 'Notificação',
        body: n.content.body ?? '',
        fireAt: getFireDate(n.trigger),
        kind: kindOf(n.content.title),
      }))
      .sort((a, b) => (a.fireAt?.getTime() ?? 0) - (b.fireAt?.getTime() ?? 0));
  }, []);

  useEffect(() => {
    load().then(setItems).catch(() => setItems([]));
  }, [load]);

  const remove = async (identifier: string) => {
    setBusyId(identifier);
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      setItems(await load());
    } finally {
      setBusyId(null);
    }
  };

  const clearAll = async () => {
    setBusyId('all');
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setItems(await load());
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      {items === null ? (
        <Spinner label="A carregar…" />
      ) : items.length === 0 ? (
        <>
          <EmptyState
            title="Sem notificações"
            subtitle="Os alarmes da Hora do Boom aparecem aqui. Ativa-os para receberes o aviso 5 minutos antes."
          />
          <AppButton
            title="Ativar alarmes"
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
                    <AppText variant="small" style={{ color: Colors.textFaint }}>{formatFire(item.fireAt)}</AppText>
                  </View>
                  <Pressable onPress={() => remove(item.identifier)} disabled={busy} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={busy ? Colors.textFaint : Colors.textMuted} />
                  </Pressable>
                </Card>
              );
            })}
          </View>

          <AppButton
            title="Gerenciar Alertas"
            variant="secondary"
            icon={<Ionicons name="alarm-outline" size={18} color={Colors.accent} />}
            onPress={() => router.push('/(tabs)/horarios')}
            style={{ marginBottom: Spacing.sm }}
          />
          <AppButton
            title="Limpar tudo"
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
