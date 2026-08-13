import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Spinner } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import {
  cancelBoomAlarm,
  getBoomAlarm,
  scheduleBoomAlarm,
} from '@/lib/notifications';

export function AlarmToggle({
  boomId,
  boomTime,
  title,
}: {
  boomId: string;
  boomTime: string;
  title: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    getBoomAlarm(boomId).then((alarm) => {
      if (active) {
        setArmed(!!alarm);
        setBusy(false);
      }
    });
    return () => {
      active = false;
    };
  }, [boomId]);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (armed) {
        await cancelBoomAlarm(boomId);
        setArmed(false);
      } else {
        const ok = await scheduleBoomAlarm(boomId, boomTime, title);
        if (ok) {
          setArmed(true);
        } else {
          setBlocked(true);
        }
      }
    } finally {
      setBusy(false);
    }
  }, [armed, busy, boomId, boomTime, title]);

  if (busy) return <Spinner />;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        style={[styles.button, armed && styles.armed]}>
        <Ionicons
          name={armed ? 'alarm' : 'alarm-outline'}
          size={16}
          color={armed ? Colors.bg : Colors.accent}
        />
        <AppText variant="small" style={{ color: armed ? Colors.bg : Colors.accent, fontWeight: '700' }}>
          {armed ? 'Alarme ativo' : 'Ativar alarme'}
        </AppText>
      </Pressable>
      {armed ? (
        <AppText variant="small" style={{ color: Colors.textMuted }}>
          Notificamos-te 5 min antes.
        </AppText>
      ) : null}
      {blocked ? (
        <AppText variant="small" style={{ color: Colors.destructive }}>
          Notificações bloqueadas — ativa nas definições do sistema.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs, marginTop: Spacing.xs },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: `${Colors.accent}1A`,
    borderColor: `${Colors.accent}55`,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  armed: { backgroundColor: Colors.accent, borderColor: Colors.accent },
});
