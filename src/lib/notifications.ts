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

export async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Alarmes da Hora do Boom',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16A43A',
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
 * Agenda um alarme 5 minutos antes do horário de um boom.
 * O identificador da notificação agendada fica guardado em boom_alarms (local).
 */
export async function scheduleBoomAlarm(boomId: string, boomTime: string, title: string): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const fireAt = new Date(new Date(boomTime).getTime() - 5 * 60 * 1000);
  if (fireAt.getTime() <= Date.now()) return false;

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hora do Boom',
      body: `${title} começa em 5 minutos!`,
      data: { url: '/(tabs)/horarios', boomId },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });

  const entries = await loadAlarmEntries();
  entries.push({ identifier, boomId });
  await saveAlarmEntries(entries);
  return true;
}

export async function cancelAllBoomAlarms(): Promise<void> {
  const entries = await loadAlarmEntries();
  for (const entry of entries) {
    try {
      await Notifications.cancelScheduledNotificationAsync(entry.identifier);
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
