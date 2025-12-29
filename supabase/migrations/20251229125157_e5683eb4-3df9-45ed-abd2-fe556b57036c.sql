-- Add level-based commission rate settings
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('commission_rate_bronze', '5', 'Commission rate percentage for Bronze level users'),
  ('commission_rate_silver', '7', 'Commission rate percentage for Silver level users'),
  ('commission_rate_gold', '10', 'Commission rate percentage for Gold level users')
ON CONFLICT (key) DO NOTHING;