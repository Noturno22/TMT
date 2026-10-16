// Backfill pontual: reclassifica sinais 'expired' que na verdade tocaram TP/SL
// intra-candle. Reutiliza a logica testada de _shared/close-decision.ts.
//
// Uso:
//   deno run --allow-net --allow-env backfill-signals.ts --dry
//   deno run --allow-net --allow-env backfill-signals.ts --only=crypto
//   deno run --allow-net --allow-env backfill-signals.ts --only=forex
//
// Env: SUPABASE_URL, SERVICE_KEY, TWELVE_DATA_KEY

import { replayCloseFromCandles, pipsOf, riskRewardOf, type Ohlc } from '../mobile/supabase/functions/_shared/close-decision.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SERVICE_KEY') ?? '';
const TD_KEY = Deno.env.get('TWELVE_DATA_KEY') ?? '';

const args = Deno.args;
const DRY = args.includes('--dry');
const onlyArg = args.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1] : 'all';
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const TD_DELAY_MS = 8000;

const CRYPTO: Record<string, string> = {
  BTCUSD: 'BTCUSDT', BTCUSDT: 'BTCUSDT', ETHUSD: 'ETHUSDT', ETHUSDT: 'ETHUSDT',
};
const TD_SYMBOLS: Record<string, string> = {
  EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY', XAUUSD: 'XAU/USD',
  EURGBP: 'EUR/GBP', USDCHF: 'USD/CHF', AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD',
  NZDUSD: 'NZD/USD',
};

const norm = (s: string) => s.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function restHeaders(extra: Record<string, string> = {}) {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...extra };
}

interface Signal {
  id: string; symbol: string; timeframe: string | null; signal_type: string;
  entry_price: number | null; target_price: number | null; stop_loss: number | null;
  confidence: number | null; status: string; created_at: string; expires_at: string | null;
  smc_setup: string | null; probability_score: number | null;
}

async function fetchExpired(): Promise<Signal[]> {
  const url = `${SUPABASE_URL}/rest/v1/signals?select=*&status=eq.expired&order=created_at.asc&limit=1000`;
  const res = await fetch(url, { headers: restHeaders() });
  if (!res.ok) throw new Error(`fetch signals ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function fetchOutcomeMap(): Promise<Map<string, string>> {
  const url = `${SUPABASE_URL}/rest/v1/signal_outcomes?select=id,signal_id&limit=5000`;
  const res = await fetch(url, { headers: restHeaders() });
  if (!res.ok) throw new Error(`fetch outcomes ${res.status}`);
  const rows: { id: string; signal_id: string }[] = await res.json();
  return new Map(rows.map((r) => [r.signal_id, r.id]));
}

// ── Crypto (Binance): sem rate limit relevante, por sinal ───────────────────
async function cryptoKlines(symbol: string, startMs: number, endMs: number): Promise<Ohlc[]> {
  const bs = CRYPTO[norm(symbol)];
  if (!bs) return [];
  const out: Ohlc[] = [];
  let cursor = startMs;
  for (let i = 0; i < 5 && cursor < endMs; i++) {
    const u = `https://api.binance.com/api/v3/klines?symbol=${bs}&interval=5m&startTime=${cursor}&endTime=${endMs}&limit=1000`;
    const data = await (await fetch(u)).json();
    if (!Array.isArray(data) || data.length === 0) break;
    for (const k of data) out.push({ t: Number(k[0]), h: Number(k[2]), l: Number(k[3]) });
    const lastT = Number(data[data.length - 1][0]);
    if (data.length < 1000 || lastT < cursor) break;
    cursor = lastT + 1;
  }
  return out;
}

// ── Forex (Twelve Data): cache por simbolo para respeitar o rate limit ──────
const tdDate = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

async function tdFetch(symbol: string, startMs: number, endMs: number): Promise<Ohlc[]> {
  const sym = TD_SYMBOLS[norm(symbol)];
  if (!sym || !TD_KEY) return [];
  const u = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}&interval=5min&start_date=${encodeURIComponent(tdDate(startMs))}&end_date=${encodeURIComponent(tdDate(endMs))}&outputsize=5000&apikey=${TD_KEY}`;
  const data = await (await fetch(u)).json();
  if (data?.status === 'error' || !Array.isArray(data?.values)) {
    console.log(`TD erro ${symbol}: ${data?.message ?? data?.code ?? 'sem valores'}`);
    return [];
  }
  return data.values
    .slice()
    .reverse()
    .map((v: Record<string, string>) => ({
      t: Date.parse(`${v.datetime.replace(' ', 'T')}Z`), h: Number(v.high), l: Number(v.low),
    }))
    .filter((c: Ohlc) => Number.isFinite(c.t) && Number.isFinite(c.h) && Number.isFinite(c.l));
}

const forexRanges = new Map<string, { min: number; max: number }>();
const forexCache = new Map<string, Ohlc[]>();
const CHUNK_MS = 16 * 24 * 3600 * 1000;

async function forexAll(symbol: string): Promise<Ohlc[]> {
  const n = norm(symbol);
  if (forexCache.has(n)) return forexCache.get(n)!;
  const range = forexRanges.get(n);
  if (!range) return [];
  const all: Ohlc[] = [];
  let cursor = range.min;
  const hardEnd = range.max + 3600 * 1000;
  let guard = 0;
  while (cursor < hardEnd && guard++ < 12) {
    const end = Math.min(cursor + CHUNK_MS, hardEnd);
    const part = await tdFetch(symbol, cursor, end);
    all.push(...part);
    console.log(`  TD ${symbol} ${tdDate(cursor)}..${tdDate(end)} -> ${part.length} velas`);
    cursor = end;
    await sleep(TD_DELAY_MS);
  }
  forexCache.set(n, all);
  return all;
}

async function reclassify(sig: Signal, oldOutcomeId: string | undefined) {
  const entry = Number(sig.entry_price);
  const sl = Number(sig.stop_loss);
  const tp = Number(sig.target_price);
  const type = String(sig.signal_type).toUpperCase();

  const startMs = Date.parse(sig.created_at);
  const endMs = sig.expires_at ? Date.parse(sig.expires_at) : Date.now();
  const isCrypto = Boolean(CRYPTO[norm(sig.symbol)]);
  const isForex = Boolean(TD_SYMBOLS[norm(sig.symbol)]);

  if (!isCrypto && !isForex) {
    console.log(`SKIP ${sig.symbol} ${sig.id} (sem fonte)`);
    return { outcome: 'skip' as const };
  }
  if (!(entry > 0) || !(sl > 0) || !(tp > 0)) {
    console.log(`SKIP ${sig.symbol} ${sig.id} (niveis invalidos)`);
    return { outcome: 'skip' as const };
  }

  let candles: Ohlc[];
  if (isCrypto) {
    candles = await cryptoKlines(sig.symbol, startMs, endMs);
  } else {
    const all = await forexAll(sig.symbol);
    candles = all.filter((c) => c.t >= startMs && c.t <= endMs + 3600 * 1000);
  }

  if (candles.length === 0) {
    console.log(`NO_CANDLES ${sig.symbol} ${sig.id} (${sig.created_at} -> ${sig.expires_at})`);
    return { outcome: 'nocandles' as const };
  }

  const outcome = replayCloseFromCandles({ signalType: type, entry, sl, tp, candles });
  console.log(`${outcome.toUpperCase()} ${sig.symbol} ${type} tf=${sig.timeframe} candles=${candles.length} ${sig.id}`);

  if (outcome === 'expired' || DRY) return { outcome };

  const nowIso = new Date().toISOString();
  const exitPrice = outcome === 'tp' ? tp : sl;
  const patch = await fetch(`${SUPABASE_URL}/rest/v1/signals?id=eq.${sig.id}`, {
    method: 'PATCH',
    headers: restHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ status: outcome }),
  });
  if (!patch.ok) throw new Error(`patch signal ${sig.id} ${patch.status}`);

  const row = {
    signal_id: sig.id, symbol: sig.symbol, timeframe: sig.timeframe, signal_type: sig.signal_type,
    smc_setup: sig.smc_setup || null, session_name: null, entry_price: entry, exit_price: exitPrice,
    stop_loss: sl, target_price: tp, result: outcome,
    pips_result: pipsOf(outcome, entry, sl, tp, String(sig.symbol)),
    risk_reward: Math.round(riskRewardOf(entry, sl, tp) * 100) / 100,
    confidence: sig.confidence, tech_score: sig.probability_score ?? null, closed_at: nowIso,
  };

  if (oldOutcomeId) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/signal_outcomes?id=eq.${oldOutcomeId}`, {
      method: 'PATCH', headers: restHeaders({ Prefer: 'return=minimal' }), body: JSON.stringify(row),
    });
    if (!r.ok) throw new Error(`patch outcome ${oldOutcomeId} ${r.status}`);
  } else {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/signal_outcomes`, {
      method: 'POST', headers: restHeaders({ Prefer: 'return=minimal' }), body: JSON.stringify(row),
    });
    if (!r.ok) throw new Error(`insert outcome ${sig.id} ${r.status}: ${await r.text()}`);
  }
  return { outcome };
}

const signals = await fetchExpired();
const outcomeMap = await fetchOutcomeMap();

const kind = (s: Signal) => (CRYPTO[norm(s.symbol)] ? 'crypto' : 'forex');
const targets = signals.filter((s) => ONLY === 'all' || kind(s) === ONLY).slice(0, LIMIT);

// Calcula o intervalo temporal por simbolo forex (para o cache de velas).
for (const s of targets) {
  const n = norm(s.symbol);
  if (!TD_SYMBOLS[n]) continue;
  const a = Date.parse(s.created_at);
  const b = s.expires_at ? Date.parse(s.expires_at) : Date.now();
  const r = forexRanges.get(n);
  forexRanges.set(n, r ? { min: Math.min(r.min, a), max: Math.max(r.max, b) } : { min: a, max: b });
}

console.log(`DRY=${DRY} ONLY=${ONLY} total_expired=${signals.length} a_processar=${targets.length} (delay TD=${TD_DELAY_MS}ms)\n`);

let tp = 0, sl = 0, expired = 0, skip = 0, nocandles = 0;
for (const sig of targets) {
  try {
    const { outcome } = await reclassify(sig, outcomeMap.get(sig.id));
    if (outcome === 'tp') tp++;
    else if (outcome === 'sl') sl++;
    else if (outcome === 'expired') expired++;
    else if (outcome === 'skip') skip++;
    else if (outcome === 'nocandles') nocandles++;
  } catch (e) {
    console.error(`ERRO ${sig.symbol} ${sig.id}: ${(e as Error).message}`);
    skip++;
  }
}

console.log(`\nResumo: reclassificados tp=${tp} sl=${sl} | continuam expirados=${expired} | sem velas=${nocandles} | saltados=${skip}`);
if (tp + sl > 0) {
  console.log(`Nova taxa de acerto desta amostra: ${Math.round((tp / (tp + sl)) * 100)}% (${tp}/${tp + sl})`);
}
