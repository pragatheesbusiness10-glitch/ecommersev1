-- Add mobile_number to kyc_submissions table
ALTER TABLE public.kyc_submissions
ADD COLUMN mobile_number text;

-- Add last_ip_address and last_login_at to profiles table for IP tracking
ALTER TABLE public.profiles
ADD COLUMN last_ip_address text,
ADD COLUMN last_login_at timestamp with time zone;

-- Add selling_percentage_min and selling_percentage_max platform settings
INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('selling_percentage_min', '2', 'Minimum selling percentage for users'),
  ('selling_percentage_max', '5', 'Maximum selling percentage for users')
ON CONFLICT (key) DO NOTHING;