-- Create IP logs table for comprehensive IP tracking
CREATE TABLE public.ip_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address TEXT NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_ip_logs_user_id ON public.ip_logs(user_id);
CREATE INDEX idx_ip_logs_created_at ON public.ip_logs(created_at DESC);
CREATE INDEX idx_ip_logs_action_type ON public.ip_logs(action_type);

-- Enable RLS
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view IP logs
CREATE POLICY "Admins can view all IP logs"
  ON public.ip_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow authenticated users to insert their own IP logs
CREATE POLICY "Users can insert their own IP logs"
  ON public.ip_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);