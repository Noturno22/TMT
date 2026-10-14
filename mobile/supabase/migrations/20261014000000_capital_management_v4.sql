-- ============================================================================
-- CAPITAL MANAGEMENT V4
--
-- 1) Levantamento antecipado: penalidade de 10% (antes 15%). O 15% deixa de
--    existir. O cliente submete o valor BRUTO pretendido; o servidor calcula
--    o líquido e regista o snapshot da penalidade.
-- 2) withdrawal_requests: colunas de snapshot (penalty_pct, penalty_amount,
--    net_amount). Um trigger BEFORE INSERT valida (utilizador, moeda,
--    amount > 0, saldo disponível) e preenche a penalidade — não é forjável
--    pelo cliente, mesmo que insira diretamente na tabela via RLS.
-- 3) Ciclo de vida dos contratos: expire_capital_contracts() marca
--    active -> completed quando end_date < current_date. O RPC de ativação
--    expira antes de decidir, o que liberta a renovação (índice único parcial
--    uq_capital_contracts_active). Cron diário como rede de segurança.
-- 4) activate_capital_contract v2: cria com penalty_pct 10 / terms_version 'v2'.
--
-- Idempotente: pode ser reaplicada sem efeitos duplicados.
-- ============================================================================

-- ── 1) Penalidade 10% ───────────────────────────────────────────────────────
alter table public.capital_contracts
  alter column penalty_pct set default 10;

update public.capital_contracts
  set penalty_pct = 10, updated_at = now()
  where penalty_pct is distinct from 10;

-- ── 2) withdrawal_requests: snapshot de penalidade + líquido ────────────────
alter table public.withdrawal_requests
  add column if not exists penalty_pct    numeric(8,2)  not null default 0,
  add column if not exists penalty_amount numeric(14,2) not null default 0,
  add column if not exists net_amount     numeric(14,2);

create or replace function public.withdrawal_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.capital_contracts;
  v_balance  numeric;
  v_pending  numeric;
begin
  if new.user_id is null then
    raise exception 'Utilizador inválido';
  end if;

  new.currency := lower(coalesce(new.currency, 'usd'));
  if new.currency not in ('usd', 'aoa') then
    raise exception 'Moeda inválida';
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Valor inválido';
  end if;

  -- Saldo disponível = valor atual (achieved) menos pedidos ainda em curso.
  select achieved into v_balance
  from public.capital_accounts
  where user_id = new.user_id and currency = new.currency;
  v_balance := coalesce(v_balance, 0);

  select coalesce(sum(amount), 0) into v_pending
  from public.withdrawal_requests
  where user_id = new.user_id
    and currency = new.currency
    and status in ('pending', 'approved');

  if new.amount > (v_balance - v_pending) then
    raise exception 'Saldo insuficiente';
  end if;

  -- O cliente não controla o estado nem a penalidade.
  new.status         := 'pending';
  new.penalty_pct    := 0;
  new.penalty_amount := 0;

  select * into v_contract
  from public.capital_contracts
  where user_id = new.user_id and status = 'active'
  order by created_at desc
  limit 1;

  -- Penalidade só se levantar antes do fim do prazo (limite máximo).
  if v_contract.id is not null and current_date < v_contract.end_date then
    new.penalty_pct    := coalesce(v_contract.penalty_pct, 0);
    new.penalty_amount := round(new.amount * new.penalty_pct / 100.0, 2);
  end if;

  new.net_amount := new.amount - new.penalty_amount;
  return new;
end;
$$;

drop trigger if exists trg_wr_before_insert on public.withdrawal_requests;
create trigger trg_wr_before_insert
  before insert on public.withdrawal_requests
  for each row execute function public.withdrawal_requests_before_insert();

-- ── 3) Ciclo de vida ────────────────────────────────────────────────────────
create or replace function public.expire_capital_contracts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with upd as (
    update public.capital_contracts
      set status = 'completed', updated_at = now()
    where status = 'active' and end_date < current_date
    returning 1
  )
  select count(*) into v_count from upd;
  return v_count;
end;
$$;

revoke all on function public.expire_capital_contracts() from public;
revoke all on function public.expire_capital_contracts() from anon;
revoke all on function public.expire_capital_contracts() from authenticated;
grant execute on function public.expire_capital_contracts() to service_role;

-- Cron diário (rede de segurança; o RPC já expira no momento da ativação).
do $$ begin
  perform cron.unschedule('expire-capital-contracts-daily');
exception when others then null;
end $$;

do $$ begin
  perform cron.schedule(
    'expire-capital-contracts-daily',
    '5 0 * * *',
    'select public.expire_capital_contracts();'
  );
exception when others then null;
end $$;

-- ── 4) RPC activate_capital_contract v2 (10%, expira antes de decidir) ──────
create or replace function public.activate_capital_contract(
  p_plan_id text,
  p_currency text default 'usd'
)
returns public.capital_contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_months   int;
  v_currency text := lower(p_currency);
  v_capital  numeric(14,2);
  v_contract public.capital_contracts;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;
  if v_currency not in ('usd', 'aoa') then
    raise exception 'Moeda inválida';
  end if;

  select case p_plan_id
    when 'conservador' then 3
    when 'equilibrado' then 2
    when 'agressivo'  then 1
  end into v_months;
  if v_months is null then
    raise exception 'Plano inválido';
  end if;

  -- Expira contratos vencidos antes de decidir (liberta a renovação).
  update public.capital_contracts
    set status = 'completed', updated_at = now()
  where user_id = v_user and status = 'active' and end_date < current_date;

  -- Idempotente: contrato ativo existente -> devolve tal qual.
  select * into v_contract
  from public.capital_contracts
  where user_id = v_user and status = 'active'
  order by created_at desc
  limit 1;
  if v_contract.id is not null then
    return v_contract;
  end if;

  -- Capital inicial = saldo atual da conta (0 se ainda não existir).
  select capital into v_capital
  from public.capital_accounts
  where user_id = v_user and currency = v_currency;
  v_capital := coalesce(v_capital, 0);

  insert into public.capital_contracts
    (user_id, plan_id, currency, capital_inicial, start_date, end_date, months, status, penalty_pct, terms_version)
  values
    (v_user, p_plan_id, v_currency, v_capital,
     current_date,
     (current_date + (v_months || ' months')::interval)::date,
     v_months, 'active', 10, 'v2')
  returning * into v_contract;

  return v_contract;
end;
$$;

revoke execute on function public.activate_capital_contract(text, text) from public, anon;
grant execute on function public.activate_capital_contract(text, text) to authenticated;
