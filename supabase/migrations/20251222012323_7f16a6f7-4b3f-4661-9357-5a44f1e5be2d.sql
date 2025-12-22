-- Add storefront_banner column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN storefront_banner text DEFAULT 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=400&fit=crop';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.storefront_banner IS 'URL for the storefront banner image';