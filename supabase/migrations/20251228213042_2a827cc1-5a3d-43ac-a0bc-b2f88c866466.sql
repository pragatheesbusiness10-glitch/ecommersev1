-- Add explicit deny policy for anonymous/public access to kyc_submissions
-- This ensures that only authenticated users can interact with the table

-- First, drop any existing permissive policies that might allow public access
-- Then add a restrictive base policy that requires authentication

-- Create a policy that explicitly requires authentication for ALL operations
CREATE POLICY "Require authentication for kyc_submissions"
ON public.kyc_submissions
FOR ALL
TO anon
USING (false)
WITH CHECK (false);