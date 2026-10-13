import { MIN_CAPITAL_DEPOSIT } from '@/lib/plans';

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

/** Progresso até à meta em % (0..100). Meta usa capital x metaPercent/100. */
export function progressPct(achieved: number, capital: number, metaPercent: number): number {
  const target = (capital * metaPercent) / 100;
  if (target <= 0) return 0;
  const p = (profit(achieved, capital) / target) * 100;
  return isFinite(p) ? clamp(p, 0, 100) : 100;
}

/** Montante que pode ser pedido em saque: nunca negativo. */
export function withdrawable(achieved: number): number {
  if (!isFinite(achieved)) return 0;
  return Math.max(0, achieved);
}

/** Mínimo de depósito de gestão por moeda. Ver MIN_CAPITAL_DEPOSIT em @/lib/plans. */

/** Formata o depósito mínimo para exibição, ex.: "US$50" / "50 000 Kz". */
export function formatMinDepositCore(currency: 'usd' | 'aoa'): string {
  const v = MIN_CAPITAL_DEPOSIT[currency];
  return currency === 'aoa' ? `${v.toLocaleString('pt-PT')} Kz` : `$${v}`;
}

/** Dias entre duas datas (YYYY-MM-DD ou ISO). Mínimo 1 para evitar divisão por zero. */
export function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.max(1, Math.round(ms / 86_400_000));
}

/** Ganho diário médio de um relatório: lucro do período ÷ dias do período. */
export function dailyGain(report: { period_start: string; period_end: string; profit: number }): number {
  return report.profit / daysBetween(report.period_start, report.period_end);
}

/** Valor líquido após penalidade (%): levantar X antes do prazo → X × (1 − pct/100). */
export function netAfterPenalty(amount: number, penaltyPct: number): number {
  if (!isFinite(amount) || !isFinite(penaltyPct)) return 0;
  return Math.max(0, amount * (1 - penaltyPct / 100));
}

/** Dias restantes até à data de fim (0 se já passou). */
export function daysUntil(endDate: string): number {
  if (!endDate) return 0;
  const end = new Date(`${endDate}T23:59:59`);
  const diff = Math.round((end.getTime() - Date.now()) / 86_400_000);
  return Math.max(0, diff);
}

/** O contrato já terminou? */
export function contractEnded(endDate: string): boolean {
  if (!endDate) return false;
  return new Date(`${endDate}T23:59:59`).getTime() < Date.now();
}