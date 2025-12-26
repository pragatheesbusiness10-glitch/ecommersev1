-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to upload to branding bucket
CREATE POLICY "Admins can upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated admins to update branding assets
CREATE POLICY "Admins can update branding assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated admins to delete branding assets
CREATE POLICY "Admins can delete branding assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow public read access to branding assets
CREATE POLICY "Public can view branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');