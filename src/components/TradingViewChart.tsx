import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { TV_INTERVALS } from '@/core/gating';
import { Colors } from '@/core/theme';
import { Spinner } from '@/components/ui';

function tvSymbol(pair: string): string {
  const raw = pair.replace('/', '');
  if (raw === 'BTCUSD') return 'BITSTAMP:BTCUSD';
  if (raw === 'XAUUSD') return 'OANDA:XAUUSD';
  return `FX_IDC:${raw}`;
}

interface ChartLevel {
  price: number;
  color: string;
  text: string;
  dashed?: boolean;
}

function buildLevels(entry?: number, stopLoss?: number, takeProfit?: number): ChartLevel[] {
  const levels: ChartLevel[] = [];
  const push = (price: number | undefined, color: string, text: string, dashed = false) => {
    if (typeof price === 'number' && isFinite(price) && price > 0) {
      levels.push({ price, color, text, dashed });
    }
  };
  push(stopLoss, Colors.destructive, 'SL', true);
  push(entry, Colors.accent, 'ENTRADA', false);
  push(takeProfit, Colors.success, 'TP', false);
  return levels;
}

export function TradingViewChart({
  pair,
  timeframe,
  height = 360,
  entry,
  stopLoss,
  takeProfit,
}: {
  pair: string;
  timeframe?: string;
  height?: number;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
}) {
  const interval = TV_INTERVALS[timeframe ?? 'M15'] ?? '15';
  const symbol = tvSymbol(pair);
  const levels = useMemo(() => buildLevels(entry, stopLoss, takeProfit), [entry, stopLoss, takeProfit]);

  const html = useMemo(() => {
    const levelsJson = JSON.stringify(levels)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  #tv { width: 100vw; height: 100vh; }
</style>
</head>
<body>
<div id="tv"></div>
<script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
<script type="text/javascript">
  var LEVELS = ${levelsJson};
  var widget = new TradingView.widget({
    autosize: true,
    symbol: "${symbol}",
    interval: "${interval}",
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "pt",
    backgroundColor: "rgba(0, 0, 0, 0)",
    gridColor: "rgba(42, 46, 57, 0.35)",
    hide_top_toolbar: true,
    hide_side_toolbar: true,
    hide_legend: false,
    hide_volume: true,
    allow_symbol_change: false,
    save_image: false,
    withdateranges: false,
    studies: ["MASimple@tv-basicstudies", "RSI@tv-basicstudies"],
    container_id: "tv",
    onChartReady: function () {
      try {
        var chart = widget.chart();
        for (var i = 0; i < LEVELS.length; i++) {
          var lvl = LEVELS[i];
          try {
            chart.createShape({ price: lvl.price }, {
              shape: "horizontal_line",
              text: lvl.text,
              lock: true,
              disableSave: true,
              disableUndo: true,
              zOrder: "top",
              overrides: {
                linecolor: lvl.color,
                linestyle: lvl.dashed ? 2 : 0,
                linewidth: 2,
                transparency: 0
              }
            });
          } catch (e) {}
        }
      } catch (e) {}
    }
  });
</script>
</body>
</html>`;
  }, [symbol, interval, levels]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <Spinner />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    ...Platform.select({ default: {} }),
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
