-- ============================================================================
-- SINCRONIZAÇÃO COMPROVATIVO/PEDIDO -> HISTÓRICO (wallet_movements)
--
-- O histórico do utilizador (wallet_movements) era um espelho só-de-escrita:
-- quando o admin aprovava/rejeitava um comprovativo ou um levantamento, a linha
-- em payment_receipts/withdrawal_requests mudava de estado mas a cópia do
-- histórico (wallet_movements) ficava presa em 'pendente' para sempre. O guard
-- de depósito do cliente (hasPendingDepositRequest) lia esse estado obsoleto e
-- bloqueava novos depósitos permanentemente.
--
-- Correção: um trigger AFTER em cada tabela autoritativa propaga o novo estado
-- para a linha correspondente do histórico. A correspondência usa primeiro a
-- ligação explícita (receipt_id/request_id) e, quando esta é nula (clientes
-- que ainda não gravam o id), cai num fallback por utilizador + tipo + valor +
-- moeda sobre linhas ainda pendentes. O índice único parcial de depósitos
-- (uq_payment_receipts_one_pending_per_user) garante que o fallback de depósito
-- não colide entre pedidos distintos.
--
-- Idempotente: pode ser reaplicada sem efeitos duplicados.
-- ============================================================================

create or replace function public.sync_wm_from_receipt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  v_status := case new.status
    when 'approved' then 'concluido'
    when 'rejected' then 'recusado'
    else 'pendente'
  end;

  update public.wallet_movements wm
    set status = v_status, updated_at = now()
  where wm.type = 'deposit'
    and coalesce(wm.status, 'pendente') is distinct from v_status
    and (
      wm.receipt_id = new.id
      or (
        wm.receipt_id is null
        and wm.user_id = new.user_id
        and wm.status = 'pendente'
        and wm.amount = new.amount
        and lower(wm.currency) = lower(new.currency)
      )
    );

  return new;
end;
$$;

drop trigger if exists trg_sync_wm_receipt on public.payment_receipts;
create trigger trg_sync_wm_receipt
  after insert or update of status on public.payment_receipts
  for each row execute function public.sync_wm_from_receipt();

create or replace function public.sync_wm_from_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  v_status := case new.status
    when 'rejected' then 'recusado'
    when 'approved' then 'concluido'
    when 'paid' then 'concluido'
    else 'pendente'
  end;

  update public.wallet_movements wm
    set status = v_status, updated_at = now()
  where wm.type = 'withdrawal'
    and coalesce(wm.status, 'pendente') is distinct from v_status
    and (
      wm.request_id = new.id
      or (
        wm.request_id is null
        and wm.user_id = new.user_id
        and wm.status = 'pendente'
        and wm.amount = new.amount
        and lower(wm.currency) = lower(new.currency)
      )
    );

  return new;
end;
$$;

drop trigger if exists trg_sync_wm_withdrawal on public.withdrawal_requests;
create trigger trg_sync_wm_withdrawal
  after insert or update of status on public.withdrawal_requests
  for each row execute function public.sync_wm_from_withdrawal();

-- Realtime no histórico, para o cliente refletir a decisão do admin sem reload.
do $$ begin
  alter publication supabase_realtime add table public.wallet_movements;
exception when duplicate_object then null;
end $$;
