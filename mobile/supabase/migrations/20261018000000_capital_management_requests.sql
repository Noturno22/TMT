-- ============================================================================
-- CAPITAL MANAGEMENT REQUESTS
--
-- Pedido de NOVO gerenciamento de capital, submetido pelo cliente depois de o
-- contrato terminar (status 'completed' ou active com end_date no passado).
-- A equipa revê no painel admin (edge function admin-manage) e, ao aprovar,
-- é criado um novo contrato para o utilizador.
--
-- Porque uma tabela própria e não o activate_capital_contract: o RPC existente
-- ativa imediatamente um contrato quando não há nenhum ativo. O pedido aqui é
-- intencionalmente um pedido de REVISÃO pela equipa (o fluxo que faltava depois
-- de um ciclo terminar), pelo que precisa de estado pendente/aprovado/recusado
-- e de uma notificação para o painel admin.
-- ============================================================================

create table if not exists public.capital_management_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan_id     text not null check (plan_id in ('conservador','equilibrado','agressivo')),
  currency    text not null default 'usd' check (currency in ('usd','aoa')),
  note        text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_cmr_user
  on public.capital_management_requests (user_id, created_at desc);
create index if not exists idx_cmr_status
  on public.capital_management_requests (status, created_at desc);

-- Um pedido pendente por utilizador: evita spam e duplicados no painel.
create unique index if not exists uq_cmr_pending
  on public.capital_management_requests (user_id)
  where status = 'pending';

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.capital_management_requests enable row level security;

do $$ begin
  create policy "cmr_select_own" on public.capital_management_requests
    for select to authenticated using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "cmr_insert_own" on public.capital_management_requests
    for insert to authenticated with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Só o service_role (edge function admin-manage) revê os pedidos.
do $$ begin
  create policy "cmr_all_service" on public.capital_management_requests
    for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- ── Notificação para o painel admin ──────────────────────────────────────────
-- fn_notify_admin existe desde 20260822000000; o CHECK de admin_notifications.type
-- é atualizado mais abaixo para aceitar o novo tipo.
create or replace function public.fn_trg_management_request_notify()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.fn_notify_admin(
    'management_request_pending',
    'Novo pedido de gerenciamento',
    'Plano: ' || coalesce(new.plan_id, '?') || ' | ' || upper(coalesce(new.currency, 'usd')),
    'management_request',
    new.id
  );
  return new;
end $$;

drop trigger if exists trg_admin_management_request_notify on public.capital_management_requests;
create trigger trg_admin_management_request_notify
  after insert on public.capital_management_requests
  for each row execute function public.fn_trg_management_request_notify();

-- ── CHECK de admin_notifications.type: acrescentar o novo tipo ────────────────
-- Mesmo padrão da migration 20261015000000: remover o CHECK autogerado
-- (o nome varia) e recriar com a lista completa.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.admin_notifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.admin_notifications drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.admin_notifications
  add constraint admin_notifications_type_check check (type in (
    'receipt_pending','receipt_approved','receipt_rejected',
    'withdrawal_pending','withdrawal_approved','withdrawal_rejected','withdrawal_paid',
    'signal_closed','signal_tp','signal_sl',
    'new_user','subscription_expired','subscription_expiring',
    'management_request_pending',
    'system_error'
  ));

-- ── Realtime ────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.capital_management_requests;
exception when duplicate_object then null;
end $$;
