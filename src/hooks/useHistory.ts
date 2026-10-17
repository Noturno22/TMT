import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export interface HistorySignal {
  id: string;
  pair: string;
  timeframe: string;
  type: "BUY" | "SELL" | "AGUARDAR";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  result: "tp" | "sl" | "expired";
  date: string;
  profitPips: number;
}

export interface HistoryStats {
  total: number;
  tp: number;
  sl: number;
  expired: number;
  winRate: number;
  totalPips: number;
  profitFactor: number;
  expectancy: number;
}

function formatSymbol(symbol: string): string {
  if (!symbol) return "N/A";
  if (symbol.includes("/")) return symbol;
  if (symbol.length === 6) return symbol.slice(0, 3) + "/" + symbol.slice(3);
  return symbol;
}

function calcPips(entry: number, tp: number, sl: number, status: string, symbol: string): number {
  const isJPY = symbol?.includes("JPY");
  const isGold = symbol?.includes("XAU");
  const isBtc = symbol?.includes("BTC");

  let pipMultiplier: number;
  if (isJPY) pipMultiplier = 100;
  else if (isGold) pipMultiplier = 100;
  else if (isBtc) pipMultiplier = 1;
  else pipMultiplier = 10000;

  if (status === "tp") return Math.abs(tp - entry) * pipMultiplier;
  if (status === "sl") return -Math.abs(entry - sl) * pipMultiplier;
  return 0;
}

interface HistoryResult {
  signals: HistorySignal[];
  stats: HistoryStats;
}

interface HistoryRow {
  id: string;
  entry_price?: number | null;
  target_price?: number | null;
  stop_loss?: number | null;
  symbol?: string | null;
  status?: string | null;
  timeframe?: string | null;
  signal_type?: string | null;
  confidence?: number | null;
  created_at?: string | null;
}

async function fetchHistory(): Promise<HistoryResult> {
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .in("status", ["tp", "sl", "expired"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const mapped: HistorySignal[] = (data || []).map((row: HistoryRow) => {
    const entry = Number(row.entry_price) || 0;
    const tp = Number(row.target_price) || 0;
    const sl = Number(row.stop_loss) || 0;
    const symbol = row.symbol || "";
    const result = (row.status === "tp" || row.status === "sl") ? row.status : "expired";
    const profitPips = calcPips(entry, tp, sl, result, symbol);

    return {
      id: String(row.id),
      pair: formatSymbol(symbol),
      timeframe: row.timeframe ?? "H1",
      type: row.signal_type?.toUpperCase() as "BUY" | "SELL" | "AGUARDAR",
      confidence: Number(row.confidence) || 50,
      entry, stopLoss: sl, takeProfit: tp,
      result,
      date: row.created_at ?? new Date().toISOString(),
      profitPips: Math.round(profitPips * 10) / 10,
    };
  });

  return { signals: mapped, stats: computeStats(mapped) };
}

// A taxa de acerto e o profit factor olham apenas para os sinais decididos (TP/SL):
// um expirado nao ganhou nem perdeu. O expectancy e a media de pips por trade
// decidido, o valor esperado por entrada.
export function computeStats(mapped: HistorySignal[]): HistoryStats {
  const tpCount = mapped.filter((s) => s.result === "tp").length;
  const slCount = mapped.filter((s) => s.result === "sl").length;
  const expiredCount = mapped.filter((s) => s.result === "expired").length;
  const decided = tpCount + slCount;

  const totalPips = mapped.reduce((sum, s) => sum + s.profitPips, 0);
  const grossProfit = mapped.filter((s) => s.result === "tp").reduce((sum, s) => sum + s.profitPips, 0);
  const grossLoss = Math.abs(mapped.filter((s) => s.result === "sl").reduce((sum, s) => sum + s.profitPips, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

  return {
    total: mapped.length,
    tp: tpCount,
    sl: slCount,
    expired: expiredCount,
    winRate: decided > 0 ? Math.round((tpCount / decided) * 100) : 0,
    totalPips: Math.round(totalPips * 10) / 10,
    profitFactor: Number.isFinite(profitFactor) ? Math.round(profitFactor * 100) / 100 : Infinity,
    expectancy: decided > 0 ? Math.round((totalPips / decided) * 10) / 10 : 0,
  };
}

export function useHistory() {
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery<HistoryResult, Error>({
    queryKey: ["history"],
    queryFn: fetchHistory,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("signals-history-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "signals" },
        (payload) => {
          const newStatus = (payload.new as { status?: string } | null)?.status;
          const oldStatus = (payload.old as { status?: string } | null)?.status;
          const closed = (s?: string) => s === "tp" || s === "sl" || s === "expired";
          if (closed(newStatus) || closed(oldStatus)) {
            queryClient.invalidateQueries({ queryKey: ["history"] });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    signals: data?.signals ?? [],
    stats: data?.stats ?? { total: 0, tp: 0, sl: 0, expired: 0, winRate: 0, totalPips: 0, profitFactor: 0, expectancy: 0 },
    loading,
  };
}
