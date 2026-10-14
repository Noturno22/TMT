-- ============================================================================
-- FIX: admin_notifications_type_check excluía 'withdrawal_pending'
--
-- Contexto: `admin_notifications` foi criada em 20260819050000 com um CHECK que
-- lista os `type` aceites. Em 20260822000000 adicionou-se o trigger
-- `trg_admin_withdrawal_notify`, que insere type = 'withdrawal_pending' — mas a
-- tabela já existia, e o CREATE TABLE IF NOT EXISTS foi no-op, portanto o CHECK
-- antigo (sem 'withdrawal_pending') sobreviveu. Resultado: TODA a inserção em
-- withdrawal_requests abortava no AFTER INSERT trigger, e o pedido de saque
-- nunca chegava a gravar. Bug de produção; bloqueia o levantamento de banca.
--
-- Correção: substituir o CHECK por uma lista completa (os tipos já usados + os
-- de saque). Idempotente.
-- ============================================================================

-- Remove qualquer CHECK de `type` existente em admin_notifications (nome
-- autogerado pode variar), sem tocar noutras constraints.
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
    'system_error'
  ));
