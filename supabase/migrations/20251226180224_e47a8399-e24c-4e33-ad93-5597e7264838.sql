-- Fix: Restrict public access to sensitive secrets in platform_settings

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can read settings" ON public.platform_settings;

-- Create policy for public to read only non-sensitive settings
CREATE POLICY "Public can read non-sensitive settings" 
ON public.platform_settings 
FOR SELECT 
USING (
  key NOT LIKE '%_secret%' 
  AND key NOT LIKE '%_key%'
  AND key NOT LIKE '%_salt%'
  AND key NOT LIKE '%api_key%'
);

-- Create policy for admins to read all settings (including secrets)
CREATE POLICY "Admins can read all settings" 
ON public.platform_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));