-- Fix: complete the cron signal generation pipeline
-- Root cause: service_role_key was never inserted into app_config,
-- causing call_edge_function() to silently RETURN on every pg_cron invocation.

-- 1. Ensure service_role_key is set (value inserted via Management API, not hardcoded here)
-- Run manually after deployment:
-- INSERT INTO public.app_config (key, value)
-- VALUES ('service_role_key', 'YOUR_SERVICE_ROLE_KEY')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Fix signals check constraint to allow 'expired' status
ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_status_check;
ALTER TABLE public.signals ADD CONSTRAINT signals_status_check
  CHECK (status IN ('pending', 'active', 'tp', 'sl', 'expired'));

-- 3. Remove stale cron jobs that called wrong function name ('generate-signal' singular)
SELECT cron.unschedule('gerar-sinais-hora');

-- 4. Ensure the main generate-crypto-signals cron exists
-- (17 WAT times defined in 20260818000000_auto_signals_cron.sql)
