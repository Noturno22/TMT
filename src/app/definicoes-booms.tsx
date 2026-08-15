import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, Chip, EmptyState, Screen, Spinner } from '@/components/ui';
import { SectionHeader } from '@/components/SectionHeader';
import { PremiumLock } from '@/components/PremiumLock';
import { useAuth } from '@/hooks/useAuth';
import { useBoomHours } from '@/hooks/useBoomHours';
import { useSubscription } from '@/hooks/useSubscription';
import { requestNotificationPermission } from '@/lib/notifications';
import {
  DEFAULT_BOOM_PREFS,
  VOL_TIERS,
  applyBoomPrefs,
  collectBoomPairs,
  loadBoomPrefs,
  saveBoomPrefs,
  type BoomPrefs,
} from '@/lib/boomPrefs';
import { Colors, Radius, Spacing } from '@/core/theme';

async function enableNotifications() {
  const granted = await requestNotificationPermission();
  if (!granted) {
    Alert.alert('Notificações', 'Ativa as notificações nas definições do teu telemóvel.');
  }
}

export default function DefinicoesBoomsScreen() {
  const { user } = useAuth();
  const { isPremium, planTier, loading: subLoading } = useSubscription();
  const { hours, loading: hoursLoading, error: hoursError } = useBoomHours();
  const [prefs, setPrefs] = useState<BoomPrefs | null>(null);

  const premium = isPremium && planTier === 'premium';
  const userId = user?.id;

  useEffect(() => {
    let active = true;
    loadBoomPrefs(userId).then((p) => {
      if (active) setPrefs(p);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const update = useCallback(
    (patch: Partial<BoomPrefs>) => {
      setPrefs((prev) => {
        const next = { ...(prev ?? DEFAULT_BOOM_PREFS), ...patch };
        saveBoomPrefs(next, userId);
        return next;
      });
    },
    [userId],
  );

  const allPairs = useMemo(() => collectBoomPairs(hours), [hours]);
  const visibleCount = useMemo(
    () => (prefs ? applyBoomPrefs(hours, prefs).length : hours.length),
    [hours, prefs],
  );

  const togglePair = (pair: string) => {
    if (!prefs) return;
    const has = prefs.pairs.includes(pair);
    update({ pairs: has ? prefs.pairs.filter((p) => p !== pair) : [...prefs.pairs, pair] });
  };

  const toggleHidden = (id: string) => {
    if (!prefs) return;
    const hidden = prefs.hiddenIds.includes(id);
    update({ hiddenIds: hidden ? prefs.hiddenIds.filter((x) => x !== id) : [...prefs.hiddenIds, id] });
  };

  const reset = () => {
    update({ pairs: [], volTier: 'todas', hiddenIds: [] });
  };

  return (
    <Screen>
      <View style={styles.notifCard}>
        <View style={styles.notifIcon}>
          <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="label">Alarmes & Notificações</AppText>
          <AppText variant="small" style={{ color: Colors.textMuted }}>
            Recebe avisos 5 minutos antes de cada boom.
          </AppText>
        </View>
        <Pressable onPress={enableNotifications} hitSlop={8}>
          <AppText style={{ color: Colors.primary, fontWeight: '700' }}>Ativar</AppText>
        </Pressable>
      </View>

      {subLoading || prefs === null ? (
        <Spinner label="A carregar definições…" />
      ) : !premium ? (
        <View style={{ marginTop: Spacing.md }}>
          <PremiumLock
            label="Personalização Premium"
            description="Filtra os booms por tendência e pares e esconde janelas que não te interessam. Disponível apenas no plano Premium."
          />
        </View>
      ) : hoursLoading ? (
        <Spinner label="A carregar booms…" />
      ) : hoursError ? (
        <EmptyState title="Erro" subtitle={hoursError} />
      ) : (
        <>
          <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
            {visibleCount} de {hours.length} booms visíveis no teu horário.
          </AppText>

          <SectionHeader title="Tendência" subtitle="Janelas por volatilidade" />
          <View style={styles.chips}>
            {VOL_TIERS.map((t) => (
              <Chip
                key={t.key}
                label={t.label}
                active={prefs.volTier === t.key}
                onPress={() => update({ volTier: t.key })}
              />
            ))}
          </View>
          <AppText variant="small" style={{ color: Colors.textMuted, marginBottom: Spacing.lg }}>
            {VOL_TIERS.find((t) => t.key === prefs.volTier)?.label} · janelas de volatilidade{' '}
            {VOL_TIERS.find((t) => t.key === prefs.volTier)?.hint} de 1–5
          </AppText>

          <SectionHeader title="Pares" subtitle="Só vês booms com estes pares" />
          <View style={styles.chips}>
            <Chip label="Todos" active={prefs.pairs.length === 0} onPress={() => update({ pairs: [] })} />
            {allPairs.map((p) => (
              <Chip key={p} label={p} active={prefs.pairs.includes(p)} onPress={() => togglePair(p)} />
            ))}
          </View>
          {allPairs.length === 0 ? (
            <AppText variant="muted" style={{ marginBottom: Spacing.lg }}>
              Nenhum par associado aos booms.
            </AppText>
          ) : null}

          <SectionHeader title="Filtrar booms" subtitle="Oculta janelas que não queres ver" />
          {hours.length === 0 ? (
            <EmptyState title="Sem booms" />
          ) : (
            hours.map((h) => {
              const hidden = prefs.hiddenIds.includes(h.id);
              return (
                <View key={h.id} style={[styles.boomRow, hidden && styles.boomRowHidden]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="label" style={hidden ? styles.boomTitleHidden : undefined}>{h.title}</AppText>
                    <AppText variant="small" style={{ color: Colors.textMuted }}>
                      {h.time_wat} WAT · {(h.pairs || []).join(', ')}
                    </AppText>
                  </View>
                  <Switch
                    value={!hidden}
                    onValueChange={() => toggleHidden(h.id)}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.text}
                  />
                </View>
              );
            })
          )}

          <View style={{ marginTop: Spacing.md }}>
            <AppButton title="Repor predefinições" variant="ghost" onPress={reset} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: `${Colors.primary}0D`,
    borderColor: `${Colors.primary}40`,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  notifIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${Colors.primary}1F`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  boomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  boomRowHidden: { opacity: 0.55 },
  boomTitleHidden: { textDecorationLine: 'line-through' },
});
