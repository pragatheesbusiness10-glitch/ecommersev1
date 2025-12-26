-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view storefront profiles" ON public.profiles;

-- Create a security definer function to safely expose only public storefront data
CREATE OR REPLACE FUNCTION public.get_public_storefront_profile(_slug text)
RETURNS TABLE (
  user_id uuid,
  storefront_name text,
  storefront_slug text,
  storefront_banner text,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.storefront_name,
    p.storefront_slug,
    p.storefront_banner,
    p.name as display_name
  FROM public.profiles p
  WHERE p.storefront_slug = _slug
  LIMIT 1
$$;