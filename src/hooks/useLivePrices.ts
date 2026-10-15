import { useState, useEffect } from "react";

interface PriceData {
  price: string;
  change: number;
}

// Casas decimais por par, so para formatar. O preco vem ja calculado do
// proxy em /api/rates.
const DECIMALS: Record<string, number> = {
  "EUR/USD": 5,
  "GBP/USD": 5,
  "USD/JPY": 3,
  "AUD/USD": 5,
  "EUR/GBP": 5,
  "USD/CHF": 5,
  "NZD/USD": 5,
  "USD/CAD": 5,
  "XAU/USD": 2,
  "BTC/USD": 2,
};

interface RatesPayload {
  date: string;
  pairs: Record<string, { price: number; change: number } | null>;
  stale: boolean;
}

const VAZIO = { price: "—", change: 0 };

/**
 * O preco do bitcoin vem do proxy em /api/rates, que o busca a Binance no
 * servidor (sem CORS). Nao ha pedido directo do browser: a Binance nao
 * devolve cabecalhos CORS para este endpoint, pelo que um fetch do cliente
 * falhava sempre e so sujava a consola. A resiliencia esta no servidor
 * (fallback da Binance em api/rates) e, aqui, no merge par-a-par abaixo,
 * que mantem o ultimo valor conhecido quando a fonte nao responde.
 */
export function useLivePrices(pairs: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);

    const cambiais = pairs.filter((p) => p !== "BTC/USD");
    const querBtc = pairs.includes("BTC/USD");

    // Um unico pedido, a partir da nossa origem. Antes eram 16
    // (8 pares x 2 datas) e falhavam com ERR_FAILED.
    const taxas = await fetch("/api/rates")
      .then((r) => (r.ok ? (r.json() as Promise<RatesPayload>) : null))
      .catch(() => null);

    // O preco do bitcoin vem no mesmo payload do proxy em /api/rates.
    // Quando nao chega, o merge par-a-par abaixo mantem o ultimo valor
    // conhecido para nao deixar em branco um dos numeros que os
    // subscritores pagam para ver.
    const btcBruto = querBtc ? taxas?.pairs?.["BTC/USD"] : undefined;
    const btc = btcBruto && Number.isFinite(btcBruto.price) ? btcBruto : null;

    const results: Record<string, PriceData> = {};
    for (const pair of cambiais) {
      const raw = taxas?.pairs?.[pair];
      results[pair] =
        raw && Number.isFinite(raw.price)
          ? { price: raw.price.toFixed(DECIMALS[pair] ?? 2), change: raw.change }
          : VAZIO;
    }
    if (querBtc) {
      results["BTC/USD"] = btc
        ? { price: btc.price.toFixed(2), change: Math.round(btc.change * 100) / 100 }
        : VAZIO;
    }

    // Par a par: quando um par nao chega, mantem-se o ultimo valor
    // conhecido so para esse par. Um preco de ha um minuto e melhor do
    // que um espaco em branco, mas a falha de uma fonte nao pode
    // apagar os valores frescos da outra.
    setPrices((prev) => {
      const next = { ...prev };
      for (const pair of pairs) {
        const anterior = prev[pair];
        next[pair] = results[pair] === VAZIO && anterior ? anterior : results[pair];
      }
      return next;
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, [pairs.join(",")]);

  return { prices, loading, refetch: fetchAll };
}
