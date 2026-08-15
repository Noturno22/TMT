import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Signal, SignalTier } from '@/core/types';

const SIGNAL_CHANNEL_ID = 'signals';
const SIGNAL_KEY_PREFIX = 'signal_notified';

interface NotifiedSignal {
  id: string;
  timestamp: number;
}

async function ensureSignalChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(SIGNAL_CHANNEL_ID, {
      name: 'Novos Sinais',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16A43A',
    });
  }
}

async function loadNotifiedSignals(): Promise<NotifiedSignal[]> {
  const raw = await AsyncStorage.getItem(SIGNAL_KEY_PREFIX);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveNotifiedSignals(signals: NotifiedSignal[]): Promise<void> {
  await AsyncStorage.setItem(SIGNAL_KEY_PREFIX, JSON.stringify(signals));
}

function formatSignalType(type: Signal['type']): string {
  return type === 'BUY' ? 'COMPRA' : type === 'SELL' ? 'VENDA' : 'AGUARDAR';
}

function getSignalEmoji(type: Signal['type']): string {
  return type === 'BUY' ? '🟢' : type === 'SELL' ? '🔴' : '🟡';
}

function getTierLabel(tier: SignalTier): string {
  return tier === 'premium' ? 'PREMIUM' : tier === 'pro' ? 'PRO' : 'GRÁTIS';
}

export async function notifyNewSignal(signal: Signal): Promise<boolean> {
  const granted = await requestSignalPermission();
  if (!granted) return false;

  const notified = await loadNotifiedSignals();
  const alreadyNotified = notified.some((n) => n.id === signal.id);
  if (alreadyNotified) return false;

  await ensureSignalChannel();

  const typeLabel = formatSignalType(signal.type);
  const emoji = getSignalEmoji(signal.type);
  const tierLabel = getTierLabel(signal.tier);
  const rr = signal.riskReward ? `R:R 1:${signal.riskReward}` : '';
  const expires = signal.expiresAt
    ? ` Expira: ${new Date(signal.expiresAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} Novo Sinal ${tierLabel}: ${signal.pair} ${typeLabel}`,
        body: `Entrada: ${signal.entry} | SL: ${signal.stopLoss} | TP: ${signal.takeProfit} ${rr}${expires}`,
        data: { url: `/sinal/${signal.id}`, signalId: signal.id, type: 'signal' },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'SIGNAL',
        interruptionLevel: Platform.OS === 'ios' ? 'active' : undefined,
      },
      trigger: null,
    });

    notified.push({ id: signal.id, timestamp: Date.now() });
    if (notified.length > 500) notified.splice(0, notified.length - 500);
    await saveNotifiedSignals(notified);
    return true;
  } catch {
    return false;
  }
}

export async function notifyMultipleSignals(signals: Signal[]): Promise<number> {
  let count = 0;
  for (const signal of signals) {
    const ok = await notifyNewSignal(signal);
    if (ok) count++;
  }
  return count;
}

async function requestSignalPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return req.granted;
}

export async function clearNotifiedSignals(): Promise<void> {
  await AsyncStorage.removeItem(SIGNAL_KEY_PREFIX);
}