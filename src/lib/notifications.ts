import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ALARMS_KEY = 'boom_alarms';
const CHANNEL_ID = 'booms';
const CHANNEL_ID_ALARM = 'booms_alarm';
const UPGRADE_KEY_PREFIX = 'plan_upgrade_prompt';
const UPGRADE_CHANNEL_ID = 'planos';

export async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Avisos da Hora do Boom (5 min)',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16A43A',
    });

    await Notifications.setNotificationChannelAsync(CHANNEL_ID_ALARM, {
      name: 'Alarme da Hora do Boom (exato)',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FF3B30',
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return req.granted;
}

export async function loadAlarms(): Promise<string[]> {
  const entries = await loadAlarmEntries();
  return entries.map((e) => e.identifier);
}

interface AlarmEntry {
  identifier: string;
  boomId: string;
  warningId?: string;
}

async function loadAlarmEntries(): Promise<AlarmEntry[]> {
  const raw = await AsyncStorage.getItem(ALARMS_KEY);
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (e): e is AlarmEntry =>
          !!e && typeof e.identifier === 'string' && typeof e.boomId === 'string',
      );
    }
  } catch {
    // ignore
  }
  return [];
}

async function saveAlarmEntries(entries: AlarmEntry[]): Promise<void> {
  await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(entries));
}

export async function getBoomAlarm(boomId: string): Promise<AlarmEntry | null> {
  const entries = await loadAlarmEntries();
  return entries.find((e) => e.boomId === boomId) ?? null;
}

export async function cancelBoomAlarm(boomId: string): Promise<boolean> {
  const entries = await loadAlarmEntries();
  const matching = entries.filter((e) => e.boomId === boomId);
  if (matching.length === 0) return false;
  for (const entry of matching) {
    try {
      await Notifications.cancelScheduledNotificationAsync(entry.identifier);
      if (entry.warningId) await Notifications.cancelScheduledNotificationAsync(entry.warningId);
    } catch {
      // ignore
    }
  }
  await saveAlarmEntries(entries.filter((e) => e.boomId !== boomId));
  return true;
}

export interface ScheduledAlarm {
  id: string;
  boomId: string;
  fireAt: string;
  title: string;
}

/**
 * Agenda DOIS alarmes para um boom:
 * 1. Aviso 5 minutos antes (para preparar)
 * 2. Alarme EXATO na hora do boom (comporta como alarme real: acorda tela, som alto, full-screen)
 * O identificador fica guardado em boom_alarms (local).
 */
export async function scheduleBoomAlarm(boomId: string, boomTime: string, title: string): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const boomDate = new Date(boomTime);
  const warningAt = new Date(boomDate.getTime() - 5 * 60 * 1000);
  const now = Date.now();

  if (warningAt.getTime() <= now && boomDate.getTime() <= now) return false;

  const entries = await loadAlarmEntries();
  const existing = entries.find((e) => e.boomId === boomId);
  if (existing) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existing.identifier);
      if (existing.warningId) await Notifications.cancelScheduledNotificationAsync(existing.warningId);
    } catch {
      // ignore
    }
  }

  let warningId: string | undefined;
  let alarmId: string;

  if (warningAt.getTime() > now) {
    warningId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Preparação: Hora do Boom',
        body: `${title} começa em 5 minutos! Prepare-se.`,
        data: { url: '/(tabs)/horarios', boomId, type: 'warning' },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        interruptionLevel: Platform.OS === 'ios' ? 'active' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: warningAt,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    });
  }

  alarmId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 HORA DO BOOM!',
      body: `${title} COMEÇOU AGORA!`,
      data: { url: '/(tabs)/horarios', boomId, type: 'alarm' },
      sound: Platform.OS === 'ios' ? 'default' : undefined,
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: 'BOOM_ALARM',
      interruptionLevel: Platform.OS === 'ios' ? 'timeSensitive' : undefined,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: boomDate,
      channelId: Platform.OS === 'android' ? CHANNEL_ID_ALARM : undefined,
    },
  });

  const filtered = entries.filter((e) => e.boomId !== boomId);
  filtered.push({ identifier: alarmId, boomId, warningId });
  await saveAlarmEntries(filtered);
  return true;
}

export async function cancelAllBoomAlarms(): Promise<void> {
  const entries = await loadAlarmEntries();
  for (const entry of entries) {
    try {
      await Notifications.cancelScheduledNotificationAsync(entry.identifier);
      if (entry.warningId) await Notifications.cancelScheduledNotificationAsync(entry.warningId);
    } catch {
      // ignore
    }
  }
  await saveAlarmEntries([]);
}

export async function rescheduleBoomAlarm(boomId: string, boomTime: string, title: string): Promise<boolean> {
  await cancelAllBoomAlarms();
  return scheduleBoomAlarm(boomId, boomTime, title);
}

export function getNotificationUrl(data?: unknown): string | null {
  const d = data as { url?: unknown } | undefined;
  return typeof d?.url === 'string' && d.url.startsWith('/') ? d.url : null;
}

export async function getInitialNotificationUrl(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  return getNotificationUrl(response?.notification.request.content.data);
}

export function subscribeToNotificationResponses(onOpen: (url: string) => void): { remove: () => void } {
  if (Platform.OS === 'web') return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const url = getNotificationUrl(response.notification.request.content.data);
    if (url) onOpen(url);
  });
}

// ---------- Primeira notificação (promoção de plano) ----------

async function ensureUpgradeChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(UPGRADE_CHANNEL_ID, {
      name: 'Planos e Ofertas',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFC915',
    });
  }
}

export async function hasUpgradePromptScheduled(userId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(`${UPGRADE_KEY_PREFIX}:${userId}`);
  return raw === '1';
}

/**
 * Agenda (uma única vez por utilizador) a primeira notificação do plano gratuito,
 * convidando-o a subscrever Basic, Pro ou Premium para sair do plano grátis.
 * Ao tocar, o utilizador é levado para a área de Planos.
 */
export async function scheduleUpgradePrompt(userId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (await hasUpgradePromptScheduled(userId)) return false;

  await ensureUpgradeChannel();
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Desbloqueia o Premium',
        body: 'Escolhe Basic, Pro ou Premium e sai do plano gratuito.',
        data: { url: '/planos' },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 20,
        channelId: Platform.OS === 'android' ? UPGRADE_CHANNEL_ID : undefined,
      },
    });
    await AsyncStorage.setItem(`${UPGRADE_KEY_PREFIX}:${userId}`, '1');
    return true;
  } catch {
    return false;
  }
}
