-- Add saved payment details to profiles table
ALTER TABLE public.profiles 
ADD COLUMN saved_payment_details jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.saved_payment_details IS 'Stores saved bank account and UPI details for faster payouts';