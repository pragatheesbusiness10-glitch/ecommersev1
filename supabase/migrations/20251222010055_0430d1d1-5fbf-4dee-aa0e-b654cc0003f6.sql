-- Create kyc_status enum
CREATE TYPE public.kyc_status AS ENUM ('not_submitted', 'submitted', 'approved', 'rejected');

-- Create kyc_submissions table
CREATE TABLE public.kyc_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  aadhaar_number TEXT NOT NULL,
  pan_number TEXT NOT NULL,
  aadhaar_front_url TEXT NOT NULL,
  aadhaar_back_url TEXT NOT NULL,
  pan_document_url TEXT NOT NULL,
  status public.kyc_status NOT NULL DEFAULT 'submitted',
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own KYC submission
CREATE POLICY "Users can view their own KYC"
ON public.kyc_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own KYC (only if not exists or rejected)
CREATE POLICY "Users can submit KYC"
ON public.kyc_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own KYC only if rejected
CREATE POLICY "Users can update rejected KYC"
ON public.kyc_submissions
FOR UPDATE
USING (auth.uid() = user_id AND status = 'rejected');

-- Admins can view all KYC submissions
CREATE POLICY "Admins can view all KYC"
ON public.kyc_submissions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any KYC (for approval/rejection)
CREATE POLICY "Admins can update KYC"
ON public.kyc_submissions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false);

-- Storage policies for KYC documents
-- Users can upload their own documents
CREATE POLICY "Users can upload KYC documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own documents
CREATE POLICY "Users can view their own KYC documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all KYC documents
CREATE POLICY "Admins can view all KYC documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create function to check if user KYC is approved
CREATE OR REPLACE FUNCTION public.is_kyc_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kyc_submissions 
    WHERE user_id = _user_id 
    AND status = 'approved'
  )
$$;

-- Create function to get user KYC status
CREATE OR REPLACE FUNCTION public.get_kyc_status(_user_id uuid)
RETURNS kyc_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status FROM public.kyc_submissions WHERE user_id = _user_id),
    'not_submitted'::kyc_status
  )
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_kyc_submissions_updated_at
BEFORE UPDATE ON public.kyc_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();