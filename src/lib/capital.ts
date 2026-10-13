import { MIN_CAPITAL_DEPOSIT } from "@/lib/plans";

export { MIN_CAPITAL_DEPOSIT };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function profit(achieved: number, capital: number): number {
  return achieved - capital;
}

export function profitPct(achieved: number, capital: number): number {
  if (!isFinite(achieved) || !isFinite(capital)) return 0;
  if (capital <= 0) return 0;
  return (profit(achieved, capital) / capital) * 100;
}

export function progressPct(achieved: number, capital: number, metaPercent: number): number {
  const target = (capital * metaPercent) / 100;
  if (target <= 0) return 0;
  const p = (profit(achieved, capital) / target) * 100;
  return isFinite(p) ? clamp(p, 0, 100) : 100;
}

export function withdrawable(achieved: number): number {
  if (!isFinite(achieved)) return 0;
  return Math.max(0, achieved);
}

export function formatMinDepositCore(currency: "usd" | "aoa"): string {
  const v = MIN_CAPITAL_DEPOSIT[currency];
  return currency === "aoa" ? `${v.toLocaleString("pt-PT")} Kz` : `$${v}`;
}

export function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.max(1, Math.round(ms / 86_400_000));
}

export function dailyGain(report: {
  period_start: string;
  period_end: string;
  profit: number;
}): number {
  return report.profit / daysBetween(report.period_start, report.period_end);
}

export function netAfterPenalty(amount: number, penaltyPct: number): number {
  if (!isFinite(amount) || !isFinite(penaltyPct)) return 0;
  return Math.max(0, amount * (1 - penaltyPct / 100));
}

export function daysUntil(endDate: string): number {
  if (!endDate) return 0;
  const end = new Date(`${endDate}T23:59:59`);
  const diff = Math.round((end.getTime() - Date.now()) / 86_400_000);
  return Math.max(0, diff);
}

export function contractEnded(endDate: string): boolean {
  if (!endDate) return false;
  return new Date(`${endDate}T23:59:59`).getTime() < Date.now();
}
