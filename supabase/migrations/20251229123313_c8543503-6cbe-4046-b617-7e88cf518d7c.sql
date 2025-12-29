-- Create user_level enum type
CREATE TYPE public.user_level AS ENUM ('bronze', 'silver', 'gold');

-- Add user_level column to profiles table with default 'bronze'
ALTER TABLE public.profiles 
ADD COLUMN user_level public.user_level NOT NULL DEFAULT 'bronze';

-- Add usd_wallet_id to platform_settings
INSERT INTO public.platform_settings (key, value, description)
VALUES ('usd_wallet_id', '', 'USD Wallet ID for user payments')
ON CONFLICT (key) DO NOTHING;