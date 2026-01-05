-- Add geolocation columns to ip_logs table
ALTER TABLE public.ip_logs 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ip_logs_user_created ON public.ip_logs(user_id, created_at DESC);