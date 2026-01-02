-- Add platform setting for order failed error message
INSERT INTO public.platform_settings (key, value, description)
VALUES ('order_failed_message', 'Order not available in India or you are using VPN, fake order.', 'Custom error message shown when order creation fails due to geo-restriction or VPN detection')
ON CONFLICT (key) DO NOTHING;