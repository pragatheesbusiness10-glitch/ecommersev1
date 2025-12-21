-- Create platform_settings table to store configuration
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
ON public.platform_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read settings (needed for commission calculations)
CREATE POLICY "Anyone can read settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('commission_type', 'percentage', 'Commission calculation type: percentage or fixed'),
  ('commission_rate', '100', 'Commission rate (percentage of profit or fixed amount in cents)'),
  ('min_payout_amount', '50', 'Minimum wallet balance required for payout requests (in dollars)'),
  ('auto_credit_on_complete', 'true', 'Automatically credit affiliate wallet when order is completed');