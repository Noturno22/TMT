-- ============================================================================
-- CAPITAL MANAGEMENT V3
-- 1) Corrige a mutation v2: o INSERT de primeiro depósito referenciava as
--    colunas `plan` e `created_at` (inexistentes) e passava `updated_at = null`
--    (viola NOT NULL) → o ramo "conta nova" falhava sempre em silêncio.
--    Estas colunas passam a existir e o INSERT fica válido.
-- 2) capital_contracts: contrato de gerenciamento (plano, prazo, penalidade).
--    Criado pelo cliente via RPC activate_capital_contract (idempotente).
--    Escrita de lifecycle (completed/cancelled) apenas via service_role.
-- ============================================================================

-- ── 1) capital_accounts: colunas que a mutation v2 sempre assumiu ──────────
alter table public.capital_accounts
  add column if not exists plan text,
  add column if not exists created_at timestamptz not null default now();

-- Reescreve a mutation com INSERT válido (updated_at = now(), colunas reais).
create or replace function public.mutation_credit_capital_account(
  p_user_id uuid,
  p_amount numeric,
  p_currency text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_currency text := lower(p_currency);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Valor de crédito inválido';
  end if;
  if v_currency not in ('usd', 'aoa') then
    raise exception 'Moeda inválida';
  end if;

  if exists (
    select 1 from public.capital_accounts
    where user_id = p_user_id and currency = v_currency
  ) then
    update public.capital_accounts
    set capital = capital + p_amount,
        achieved = achieved + p_amount,
        updated_at = now()
    where user_id = p_user_id and currency = v_currency;
  else
    insert into public.capital_accounts
      (user_id, plan, capital, achieved, currency, total_withdrawn, status, created_at, updated_at)
    values
      (p_user_id, 'capital', p_amount, p_amount, v_currency, 0, 'active', now(), now());
  end if;
end;
$$;

-- ── 2) capital_contracts ───────────────────────────────────────────────────
create table if not exists public.capital_contracts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan_id         text not null check (plan_id in ('conservador','equilibrado','agressivo')),
  currency        text not null default 'usd' check (currency in ('usd','aoa')),
  capital_inicial numeric(14,2) not null default 0,
  start_date      date not null,
  end_date        date not null,
  months          int not null,
  status          text not null default 'active' check (status in ('active','completed','cancelled')),
  penalty_pct     numeric(8,2) not null default 15,
  terms_version   text not null default 'v1',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Um contrato ativo por utilizador (idempotência também garantida no RPC).
create unique index if not exists uq_capital_contracts_active
  on public.capital_contracts (user_id)
  where status = 'active';

create index if not exists idx_capital_contracts_user
  on public.capital_contracts (user_id, created_at desc);

alter table public.capital_contracts enable row level security;

-- Cliente: só lê o próprio. Criar/atualizar é via RPC (definer) ou service_role.
do $$ begin
  create policy "capital_contracts_select_own" on public.capital_contracts
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "capital_contracts_write_service" on public.capital_contracts
    for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- ── RPC activate_capital_contract ──────────────────────────────────────────
-- Cria o contrato a partir do plano escolhido pelo cliente:
--   conservador → 3 meses · equilibrado → 2 meses · agressivo → 1 mês
-- Idempotente: devolve o contrato ativo existente, não cria duplicado.
-- SECURITY DEFINER para o cliente não poder forjar prazos diretamente no
-- PostgREST (sem política INSERT para o role autenticado).
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
  v_user uuid := auth.uid();
  v_months int;
  v_currency text := lower(p_currency);
  v_capital numeric(14,2);
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
    when 'agressivo' then 1
  end into v_months;
  if v_months is null then
    raise exception 'Plano inválido';
  end if;

  -- Idempotente: contrato ativo existente → devolve tal qual.
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
     v_months, 'active', 15, 'v1')
  returning * into v_contract;

  return v_contract;
end;
$$;

revoke execute on function public.activate_capital_contract(text, text)
  from public, anon;
grant execute on function public.activate_capital_contract(text, text)
  to authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.capital_contracts;
exception when duplicate_object then null;
end $$;