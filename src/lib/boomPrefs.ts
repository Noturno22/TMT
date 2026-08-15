import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BoomHour } from '@/core/types';

export type VolTier = 'todas' | 'alta' | 'media' | 'baixa';

export interface BoomPrefs {
  pairs: string[];
  volTier: VolTier;
  hiddenIds: string[];
}

export const DEFAULT_BOOM_PREFS: BoomPrefs = { pairs: [], volTier: 'todas', hiddenIds: [] };

export const VOL_TIERS: { key: VolTier; label: string; hint: string }[] = [
  { key: 'todas', label: 'Todas', hint: '1–5' },
  { key: 'alta', label: 'Alta', hint: '4–5' },
  { key: 'media', label: 'Média', hint: '2–3' },
  { key: 'baixa', label: 'Baixa', hint: '1–2' },
];

const VOL_RANGE: Record<VolTier, [number, number]> = {
  todas: [1, 5],
  alta: [4, 5],
  media: [2, 3],
  baixa: [1, 2],
};

function keyFor(userId?: string): string {
  return `boom_prefs_${userId ?? 'guest'}`;
}

export async function loadBoomPrefs(userId?: string): Promise<BoomPrefs> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return DEFAULT_BOOM_PREFS;
    const p = JSON.parse(raw) as Partial<BoomPrefs>;
    return {
      pairs: Array.isArray(p.pairs) ? p.pairs : [],
      volTier: p.volTier && VOL_RANGE[p.volTier] ? p.volTier : 'todas',
      hiddenIds: Array.isArray(p.hiddenIds) ? p.hiddenIds : [],
    };
  } catch {
    return DEFAULT_BOOM_PREFS;
  }
}

export async function saveBoomPrefs(prefs: BoomPrefs, userId?: string): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(prefs));
  } catch {}
}

export function applyBoomPrefs(hours: BoomHour[], prefs: BoomPrefs): BoomHour[] {
  if (!hours) return [];
  const [min, max] = VOL_RANGE[prefs.volTier] ?? VOL_RANGE.todas;
  return hours.filter((h) => {
    if (prefs.hiddenIds.includes(h.id)) return false;
    const vol = Number(h.volatility) || 1;
    if (vol < min || vol > max) return false;
    if (prefs.pairs.length > 0 && !(h.pairs || []).some((p) => prefs.pairs.includes(p))) return false;
    return true;
  });
}

export function hasActiveFilters(prefs: BoomPrefs): boolean {
  return prefs.pairs.length > 0 || prefs.volTier !== 'todas' || prefs.hiddenIds.length > 0;
}

export function collectBoomPairs(hours: BoomHour[]): string[] {
  const set = new Set<string>();
  hours.forEach((h) => (h.pairs || []).forEach((p) => set.add(p)));
  return Array.from(set).sort();
}
