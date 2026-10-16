import { decideClose, decideCloseFromCandles, replayCloseFromCandles, pipsOf, riskRewardOf, type CloseInput } from './close-decision';

const NOW = new Date('2026-01-15T12:00:00Z');

function sinal(over: Partial<CloseInput> = {}): CloseInput {
  return {
    signalType: 'BUY',
    price: 1.1000,
    entry: 1.1000,
    sl: 1.0950,
    tp: 1.1100,
    currentStatus: 'active',
    expiresAt: '2026-01-15T16:00:00Z',
    now: NOW,
    ...over,
  };
}

describe('decideClose', () => {
  it('devolve TP e nada mais quando o preco atinge o alvo', () => {
    expect(decideClose(sinal({ price: 1.1100 }))).toBe('tp');
  });

  it('devolve SL e nada mais quando o preco atinge o stop', () => {
    expect(decideClose(sinal({ price: 1.0950 }))).toBe('sl');
  });

  it('inverte as condicoes em SELL', () => {
    const sell = { signalType: 'SELL', tp: 1.0900, sl: 1.1100 };
    expect(decideClose(sinal({ ...sell, price: 1.0900 }))).toBe('tp');
    expect(decideClose(sinal({ ...sell, price: 1.1100 }))).toBe('sl');
  });

  // Este e o bug que o modulo corrige: TP e expiracao em simultaneo devolviam dois
  // resultados, e o caller escrevia duas linhas em `signal_outcomes` e disparava
  // duas actualizacoes para a mesma linha.
  it('devolve um unico outcome quando o preco tocou o alvo E expirou', () => {
    const r = decideClose(
      sinal({ price: 1.1100, expiresAt: '2026-01-15T11:00:00Z' }),
    );
    expect(r).toBe('tp');
    expect(Array.isArray(r)).toBe(false);
  });

  it('expira sem ter tocado em TP nem SL', () => {
    expect(
      decideClose(sinal({ price: 1.1050, expiresAt: '2026-01-15T11:00:00Z' })),
    ).toBe('expired');
  });

  it('nao fecha um sinal ainda dentro da janela', () => {
    expect(decideClose(sinal({ price: 1.1050 }))).toBeNull();
  });

  // A regra chapada de 48h da raiz foi rejeitada. Um D1 expira ~72h depois de
  // gerado, e um H4 que salta para a sessao seguinte pode passar as 48h. Uma
  // regra fixa fecharia ambos cedo demais.
  it('nao expira um sinal com expires_at no futuro, mesmo acima de 48h', () => {
    expect(
      decideClose(
        sinal({ price: 1.1050, expiresAt: '2026-01-17T16:00:00Z' }), // 52h > 48h
      ),
    ).toBeNull();
  });

  it('ignora TP/SL em sinais pending, mas respeita a expiracao', () => {
    const pending = { currentStatus: 'pending', price: 1.1100 };
    expect(
      decideClose(sinal({ ...pending, expiresAt: '2026-01-15T16:00:00Z' })),
    ).toBeNull();
    expect(
      decideClose(sinal({ ...pending, expiresAt: '2026-01-15T11:00:00Z' })),
    ).toBe('expired');
  });

  it.each(['closed', 'tp', 'sl', 'expired', 'cancelled', 'qualquer-outro'])(
    'nao re-fecha um sinal em estado terminal: %s',
    (estado) => {
      expect(
        decideClose(
          sinal({ currentStatus: estado, price: 1.1100, expiresAt: '2026-01-15T11:00:00Z' }),
        ),
      ).toBeNull();
    },
  );
});

describe('pipsOf', () => {
  it('sinaliza TP positivo e SL negativo', () => {
    expect(pipsOf('tp', 1.1, 1.09, 1.12, 'EURUSD')).toBeCloseTo(200, 1);
    expect(pipsOf('sl', 1.1, 1.09, 1.12, 'EURUSD')).toBeCloseTo(-100, 1);
  });

  it('expirado vale zero', () => {
    expect(pipsOf('expired', 1.1, 1.09, 1.12, 'EURUSD')).toBe(0);
  });

  it('escala JPY e XAU por 100, nao 10000', () => {
    expect(pipsOf('tp', 150, 148, 152, 'USDJPY')).toBeCloseTo(200, 1);
    expect(pipsOf('tp', 2000, 1980, 2050, 'XAUUSD')).toBeCloseTo(5000, 1);
  });

  it('normaliza simbolos com sufixos e separadores', () => {
    expect(pipsOf('tp', 1.1, 1.09, 1.12, 'eur/usd')).toBeCloseTo(200, 1);
    expect(pipsOf('tp', 1.1, 1.09, 1.12, 'EURUSD.m')).toBeCloseTo(200, 1);
  });
});

describe('riskRewardOf', () => {
  it('razao alvo/riesco', () => {
    expect(riskRewardOf(1.1, 1.09, 1.12)).toBeCloseTo(2, 5);
  });

  it('nao divide por zero quando entrada e stop coincidem', () => {
    expect(Number.isFinite(riskRewardOf(1.1, 1.1, 1.12))).toBe(true);
  });
});

describe('decideCloseFromCandles', () => {
  const now = new Date('2026-01-15T12:00:00Z');
  function candle(t: number, h: number, l: number) {
    return { t, h, l };
  }
  function base(over: Record<string, unknown> = {}) {
    return {
      signalType: 'BUY',
      sl: 1.0950,
      tp: 1.1100,
      candles: [] as ReturnType<typeof candle>[],
      currentStatus: 'active',
      expiresAt: '2026-01-15T16:00:00Z',
      now,
      ...over,
    };
  }

  it('BUY fecha em TP quando uma vela toca o alvo (mesmo sem o preco atual o tocar)', () => {
    expect(decideCloseFromCandles(base({ candles: [candle(1, 1.1120, 1.1000)] }))).toBe('tp');
  });

  it('BUY fecha em SL quando uma vela toca o stop', () => {
    expect(decideCloseFromCandles(base({ candles: [candle(1, 1.1050, 1.0940)] }))).toBe('sl');
  });

  it('vela que toca TP e SL: assume SL primeiro (conservador)', () => {
    expect(decideCloseFromCandles(base({ candles: [candle(1, 1.1120, 1.0940)] }))).toBe('sl');
  });

  it('primeira vela por ordem cronologica decide (SL em t1 vence TP em t2)', () => {
    expect(
      decideCloseFromCandles(base({ candles: [candle(1, 1.1000, 1.0940), candle(2, 1.1120, 1.1000)] })),
    ).toBe('sl');
  });

  it('SELL inverte: high no SL, low no TP', () => {
    const sell = { signalType: 'SELL', sl: 1.1100, tp: 1.0900 };
    expect(decideCloseFromCandles(base({ ...sell, candles: [candle(1, 1.1000, 1.0880)] }))).toBe('tp');
    expect(decideCloseFromCandles(base({ ...sell, candles: [candle(1, 1.1120, 1.0900)] }))).toBe('sl');
  });

  it('sem tocar em TP nem SL devolve null', () => {
    expect(decideCloseFromCandles(base({ candles: [candle(1, 1.1050, 1.0980)] }))).toBeNull();
  });

  it('expira quando a janela passou sem tocar nenhum nivel', () => {
    expect(
      decideCloseFromCandles(base({ candles: [candle(1, 1.1050, 1.0980)], expiresAt: '2026-01-15T11:00:00Z' })),
    ).toBe('expired');
  });

  it('sinal pending nao fecha por TP/SL, mas expira', () => {
    expect(decideCloseFromCandles(base({ currentStatus: 'pending', candles: [candle(1, 1.1120, 1.0940)] }))).toBeNull();
    expect(
      decideCloseFromCandles(base({ currentStatus: 'pending', expiresAt: '2026-01-15T11:00:00Z' })),
    ).toBe('expired');
  });

  it('nao re-fecha em estado terminal', () => {
    expect(decideCloseFromCandles(base({ currentStatus: 'tp', candles: [candle(1, 1.1120, 1.0940)] }))).toBeNull();
  });
});

describe('replayCloseFromCandles', () => {
  function candle(t: number, h: number, l: number) {
    return { t, h, l };
  }
  function base(over: Record<string, unknown> = {}) {
    return {
      signalType: 'BUY',
      entry: 1.1000,
      sl: 1.0950,
      tp: 1.1100,
      candles: [] as ReturnType<typeof candle>[],
      ...over,
    };
  }

  it('expira se a entrada nunca foi tocada (nao houve trade)', () => {
    expect(
      replayCloseFromCandles(base({ candles: [candle(1, 1.1200, 1.1150), candle(2, 1.1300, 1.1200)] })),
    ).toBe('expired');
  });

  it('BUY: ativa ao tocar a entrada e fecha em TP', () => {
    expect(
      replayCloseFromCandles(base({ candles: [candle(1, 1.1010, 1.0990), candle(2, 1.1120, 1.1000)] })),
    ).toBe('tp');
  });

  it('BUY: ativa e fecha em SL', () => {
    expect(
      replayCloseFromCandles(base({ candles: [candle(1, 1.1010, 1.0990), candle(2, 1.1000, 1.0940)] })),
    ).toBe('sl');
  });

  it('ativa e fica expirado se nao tocar TP nem SL', () => {
    expect(
      replayCloseFromCandles(base({ candles: [candle(1, 1.1010, 1.0990), candle(2, 1.1050, 1.0980)] })),
    ).toBe('expired');
  });

  it('na mesma vela de ativacao, SL vence TP (conservador)', () => {
    expect(replayCloseFromCandles(base({ candles: [candle(1, 1.1120, 1.0940)] }))).toBe('sl');
  });

  it('ignora velas antes da ativacao para efeitos de TP/SL', () => {
    // Vela 1 toca TP mas a entrada so e tocada na vela 2, pelo que o TP nao conta.
    expect(
      replayCloseFromCandles(base({ candles: [candle(1, 1.1150, 1.1050), candle(2, 1.1010, 1.0990)] })),
    ).toBe('expired');
  });

  it('SELL: ativa e fecha em TP (low) / SL (high)', () => {
    const sell = { signalType: 'SELL', entry: 1.1000, sl: 1.1100, tp: 1.0900 };
    expect(
      replayCloseFromCandles(base({ ...sell, candles: [candle(1, 1.1010, 1.0990), candle(2, 1.1000, 1.0850)] })),
    ).toBe('tp');
    expect(
      replayCloseFromCandles(base({ ...sell, candles: [candle(1, 1.1010, 1.0990), candle(2, 1.1150, 1.0990)] })),
    ).toBe('sl');
  });

  it('niveis invalidos mantêm expirado', () => {
    expect(replayCloseFromCandles(base({ entry: 0, candles: [candle(1, 1.1120, 1.0940)] }))).toBe('expired');
    expect(replayCloseFromCandles(base({ sl: 0, candles: [candle(1, 1.1120, 1.0940)] }))).toBe('expired');
  });
});
