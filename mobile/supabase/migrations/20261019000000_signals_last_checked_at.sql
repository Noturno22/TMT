-- last_checked_at: instante da ultima verificacao feita pelo close-signals.
-- O close-signals passou a detetar TP/SL intra-candle (high/low das velas) e
-- precisa de saber desde quando procurar; sem esta marca teria de reprocessar
-- todo o historico do sinal em cada execucao. Fica tambem a servir de janela
-- apos a ativacao de um sinal (pending -> active).

alter table public.signals
  add column if not exists last_checked_at timestamptz;
