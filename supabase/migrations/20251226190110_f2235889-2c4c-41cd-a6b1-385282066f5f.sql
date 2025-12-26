-- Fix: Prevent users from updating their own user_status, wallet_balance, and commission_override
-- These fields should only be modifiable by admins

-- Drop the existing user update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a more restrictive update policy that prevents users from changing sensitive fields
-- Users can only update: name, storefront_name, storefront_slug, storefront_banner
CREATE POLICY "Users can update their own profile safely"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  -- The RLS policy alone can't prevent specific column updates
  -- We'll use a trigger for that
);

-- Create a trigger function to prevent users from modifying protected fields
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is an admin
  IF public.has_role(auth.uid(), 'admin') THEN
    -- Admins can update anything
    RETURN NEW;
  END IF;
  
  -- For non-admin users, prevent changes to protected fields
  IF NEW.user_status IS DISTINCT FROM OLD.user_status THEN
    RAISE EXCEPTION 'You are not allowed to modify user_status';
  END IF;
  
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'You are not allowed to modify wallet_balance';
  END IF;
  
  IF NEW.commission_override IS DISTINCT FROM OLD.commission_override THEN
    RAISE EXCEPTION 'You are not allowed to modify commission_override';
  END IF;
  
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'You are not allowed to modify is_active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_fields();

-- Also fix the public storefront policy to exclude sensitive fields
-- We can't exclude fields in RLS directly, but we document that the application
-- should only select specific columns for public queries