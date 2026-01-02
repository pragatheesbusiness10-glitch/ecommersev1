-- Create storage bucket for payout documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('payout-documents', 'payout-documents', false);

-- Allow authenticated users to upload their own payout documents
CREATE POLICY "Users can upload their own payout documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payout-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own payout documents
CREATE POLICY "Users can view their own payout documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payout-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all payout documents
CREATE POLICY "Admins can view all payout documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payout-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);