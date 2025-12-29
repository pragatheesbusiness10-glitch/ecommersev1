-- Add auto-payout settings
INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('auto_payout_enabled', 'false', 'Enable automatic payout when balance reaches threshold'),
  ('auto_payout_threshold', '1000', 'Minimum balance to trigger automatic payout'),
  ('auto_payout_schedule', 'weekly', 'Schedule for auto payout processing: daily, weekly, monthly')
ON CONFLICT (key) DO NOTHING;

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;