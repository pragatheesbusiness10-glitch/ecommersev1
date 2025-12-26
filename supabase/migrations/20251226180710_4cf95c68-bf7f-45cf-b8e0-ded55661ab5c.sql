-- Create validation trigger function for KYC submissions
CREATE OR REPLACE FUNCTION public.validate_kyc_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate Aadhaar number (must be exactly 12 digits)
  IF NEW.aadhaar_number !~ '^[0-9]{12}$' THEN
    RAISE EXCEPTION 'Invalid Aadhaar number format. Must be exactly 12 digits.';
  END IF;
  
  -- Validate PAN number (format: 5 letters, 4 digits, 1 letter)
  IF NEW.pan_number !~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$' THEN
    RAISE EXCEPTION 'Invalid PAN format. Must be 5 uppercase letters, 4 digits, 1 uppercase letter.';
  END IF;
  
  -- Validate date of birth (must be in the past and after 1900)
  IF NEW.date_of_birth >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Date of birth must be in the past.';
  END IF;
  
  IF NEW.date_of_birth < '1900-01-01'::date THEN
    RAISE EXCEPTION 'Invalid date of birth.';
  END IF;
  
  -- Validate first and last name (not empty, reasonable length)
  IF LENGTH(TRIM(NEW.first_name)) < 1 OR LENGTH(NEW.first_name) > 100 THEN
    RAISE EXCEPTION 'First name must be between 1 and 100 characters.';
  END IF;
  
  IF LENGTH(TRIM(NEW.last_name)) < 1 OR LENGTH(NEW.last_name) > 100 THEN
    RAISE EXCEPTION 'Last name must be between 1 and 100 characters.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for validation before insert or update
DROP TRIGGER IF EXISTS validate_kyc_before_insert ON public.kyc_submissions;
CREATE TRIGGER validate_kyc_before_insert
BEFORE INSERT OR UPDATE ON public.kyc_submissions
FOR EACH ROW
EXECUTE FUNCTION public.validate_kyc_submission();

-- Add payment_link column to orders table for admin-provided payment links
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_link TEXT,
ADD COLUMN IF NOT EXISTS payment_link_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_link_updated_by UUID;