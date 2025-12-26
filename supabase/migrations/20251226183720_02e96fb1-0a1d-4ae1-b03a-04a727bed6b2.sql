-- Add payment link click tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_link_clicked_at timestamp with time zone;

-- Insert branding settings
INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('site_name', 'Affiliate Platform', 'Name of the website displayed in header and title'),
  ('site_logo_url', '', 'URL of the website logo'),
  ('landing_page_enabled', 'true', 'Enable or disable the public landing page'),
  ('landing_page_title', 'Welcome to Our Platform', 'Title for the landing page'),
  ('landing_page_subtitle', 'Join our affiliate network and start earning today', 'Subtitle for the landing page')
ON CONFLICT (key) DO NOTHING;