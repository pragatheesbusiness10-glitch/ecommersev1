-- Add resend_api_key to platform_settings if it doesn't exist
INSERT INTO public.platform_settings (key, value, description)
VALUES ('resend_api_key', '', 'Resend API key for email notifications')
ON CONFLICT (key) DO NOTHING;

-- Add email_notifications_enabled setting
INSERT INTO public.platform_settings (key, value, description)
VALUES ('email_notifications_enabled', 'false', 'Enable/disable email notifications')
ON CONFLICT (key) DO NOTHING;

-- Add admin_email setting for notifications
INSERT INTO public.platform_settings (key, value, description)
VALUES ('admin_email', '', 'Admin email address for notifications')
ON CONFLICT (key) DO NOTHING;