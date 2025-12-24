-- Add RLS policy for admin to delete KYC submissions
CREATE POLICY "Admins can delete KYC"
ON public.kyc_submissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert payment gateway settings into platform_settings
INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('payment_gateway_razorpay_enabled', 'false', 'Enable Razorpay payment gateway'),
  ('payment_gateway_razorpay_key_id', '', 'Razorpay Key ID'),
  ('payment_gateway_razorpay_key_secret', '', 'Razorpay Key Secret'),
  ('payment_gateway_stripe_enabled', 'false', 'Enable Stripe payment gateway'),
  ('payment_gateway_stripe_publishable_key', '', 'Stripe Publishable Key'),
  ('payment_gateway_stripe_secret_key', '', 'Stripe Secret Key'),
  ('payment_gateway_payu_enabled', 'false', 'Enable PayU payment gateway'),
  ('payment_gateway_payu_merchant_key', '', 'PayU Merchant Key'),
  ('payment_gateway_payu_merchant_salt', '', 'PayU Merchant Salt'),
  ('payment_gateway_phonepe_enabled', 'false', 'Enable PhonePe payment gateway'),
  ('payment_gateway_phonepe_merchant_id', '', 'PhonePe Merchant ID'),
  ('payment_gateway_phonepe_salt_key', '', 'PhonePe Salt Key'),
  ('payment_gateway_phonepe_salt_index', '', 'PhonePe Salt Index'),
  ('payment_gateway_paytm_enabled', 'false', 'Enable Paytm payment gateway'),
  ('payment_gateway_paytm_merchant_id', '', 'Paytm Merchant ID'),
  ('payment_gateway_paytm_merchant_key', '', 'Paytm Merchant Key')
ON CONFLICT (key) DO NOTHING;