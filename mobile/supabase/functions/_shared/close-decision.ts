// Decisao de fecho de um sinal, sem dependencias de Deno nem de rede, para poder
// ser testada. `close-signals/index.ts` importa daqui e e o unico que fala com a
// Base de Dados.

export type CloseOutcome = 'tp' | 'sl' | 'expired';

// Estados a que ainda pode ser atribuido um fecho. Um sinal que ja saiu daqui nao
// volta a entrar, mesmo que a query que alimenta o `close-signals` alargue o filtro.
const CLOSABLE_STATUSES = new Set(['active', 'pending']);

export interface CloseInput {
  signalType: string;
  price: number;
  entry: number;
  sl: number;
  tp: number;
  currentStatus: string;
  expiresAt?: string | null;
  now: Date;
}

/**
 * Devolve no maximo um outcome. Nao ha como devolver dois: e o que garante que um
 * sinal fecha uma vez so. Uma versao anterior decidia TP/SL e a expiracao em dois
 * blocos `if` independentes, e um sinal que cumprisse os dois escrevia duas linhas
 * em `signal_outcomes` e disparava duas actualizacoes para a mesma linha.
 */
export function decideClose(input: CloseInput): CloseOutcome | null {
  const { signalType, price, entry, sl, tp, currentStatus, expiresAt, now } = input;

  if (!CLOSABLE_STATUSES.has(currentStatus)) return null;

  // TP/SL tem precedencia sobre a expiracao: se o preco tocou o alvo, o sinal
  // chegou ao alvo.
  if (currentStatus === 'active') {
    const type = signalType.toUpperCase();
    if (type === 'BUY') {
      if (price >= tp) return 'tp';
      if (price <= sl) return 'sl';
    } else if (type === 'SELL') {
      if (price <= tp) return 'tp';
      if (price >= sl) return 'sl';
    }
  }

  // `expiresAt` e a unica fonte de verdade sobre expiracao. Nao usar uma regra
  // chapada de 48h: a janela e por timeframe (nextExpiry da M15 +4h, H1 +12h,
  // D1 +3 dias) e aos fins-de-semana salta para segunda 05:00 UTC, logo 48h
  // expiraria H4 e D1 antes da hora.
  if (expiresAt && new Date(expiresAt) < now) return 'expired';

  return null;
}

export function riskRewardOf(entry: number, sl: number, tp: number): number {
  return Math.abs(tp - entry) / Math.abs(entry - sl || 1);
}

export interface Ohlc { t: number; h: number; l: number; c?: number }

/**
 * Decisao de fecho a partir das velas (high/low) desde a ultima verificacao.
 * O `close-signals` so ve o preco instantaneo no momento em que corre; um TP/SL
 * tocado entre duas execucoes era invisivel e o sinal acabava por expirar (nao
 * contava para a taxa) ou fechava no lado errado. Aqui percorremos as velas por
 * ordem cronologica e devolvemos o primeiro nivel tocado.
 *
 * Se um unico candle tocar o TP e o SL, assumimos SL primeiro: e a leitura
 * conservadora, e evita inflacionar a taxa de acerto com TPs que talvez nunca
 * tenham sido atingidos antes do stop.
 */
export function decideCloseFromCandles(input: {
  signalType: string;
  sl: number;
  tp: number;
  candles: Ohlc[];
  currentStatus: string;
  expiresAt?: string | null;
  now: Date;
}): CloseOutcome | null {
  const { signalType, sl, tp, candles, currentStatus, expiresAt, now } = input;
  if (!CLOSABLE_STATUSES.has(currentStatus)) return null;

  if (currentStatus === 'active') {
    const type = signalType.toUpperCase();
    for (const c of candles) {
      if (type === 'BUY') {
        if (c.l <= sl) return 'sl';
        if (c.h >= tp) return 'tp';
      } else if (type === 'SELL') {
        if (c.h >= sl) return 'sl';
        if (c.l <= tp) return 'tp';
      }
    }
  }

  if (expiresAt && new Date(expiresAt) < now) return 'expired';
  return null;
}

/**
 * Percorre a janela de velas a partir de um sinal ainda por entrar (pending):
 *   1. procura a vela de ativacao — o preco tocou a entrada dentro da tolerancia
 *      de 0.15% (16 pips num par de 1.08), medida pelo range da vela e nao pelo
 *      spot instantaneo (que so via o preco no instante de cada execucao);
 *   2. a partir dessa vela procura TP/SL, por ordem cronologica e com SL primeiro
 *      no mesmo candle (leitura conservadora).
 * Devolve sempre se a entrada chegou a ser tocada, para o close-signals poder
 * distinguir "ainda nao entrou" (continua pending) de "entrou e ja fechou".
 */
export interface WindowDecision { outcome: CloseOutcome; activated: boolean }

export function decideFromWindow(input: {
  signalType: string;
  entry: number;
  sl: number;
  tp: number;
  candles: Ohlc[];
}): WindowDecision {
  const { signalType, entry, sl, tp, candles } = input;
  const type = signalType.toUpperCase();

  const tol = entry * 0.0015;
  const lowBound = entry - tol;
  const highBound = entry + tol;
  let activated = false;

  for (const c of candles) {
    if (!activated) {
      if (!(c.l <= highBound && c.h >= lowBound)) continue;
      activated = true;
    }
    if (type === 'BUY') {
      if (c.l <= sl) return { outcome: 'sl', activated };
      if (c.h >= tp) return { outcome: 'tp', activated };
    } else if (type === 'SELL') {
      if (c.h >= sl) return { outcome: 'sl', activated };
      if (c.l <= tp) return { outcome: 'tp', activated };
    }
  }

  return { outcome: 'expired', activated };
}

/**
 * Replay de um sinal ja expirado: reconstroi o que teria acontecido ao percorrer
 * as velas desde a criacao. O motor antigo so via o preco spot a cada 30 min, por
 * isso a maioria dos sinais que tocaram TP/SL intra-candle acabavam por expirar e
 * nao contavam para a taxa de acerto. Mantem-se o nome para o backfill; a logica
 * vive em decideFromWindow.
 */
export function replayCloseFromCandles(input: {
  signalType: string;
  entry: number;
  sl: number;
  tp: number;
  candles: Ohlc[];
}): CloseOutcome {
  const { signalType, entry, sl, tp, candles } = input;
  if (!(entry > 0) || !(sl > 0) || !(tp > 0)) return 'expired';
  return decideFromWindow({ signalType, entry, sl, tp, candles }).outcome;
}

export function pipsOf(outcome: CloseOutcome, entry: number, sl: number, tp: number, symbol: string): number {
  if (outcome === 'expired') return 0;
  const norm = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  let pipMult = 10000;
  if (norm.includes('JPY') || norm.includes('XAU')) pipMult = 100;
  else if (norm.includes('BTC') || norm.includes('ETH')) pipMult = 1;
  const raw = outcome === 'tp' ? Math.abs(tp - entry) : -Math.abs(sl - entry);
  return Math.round(raw * pipMult * 10) / 10;
}
