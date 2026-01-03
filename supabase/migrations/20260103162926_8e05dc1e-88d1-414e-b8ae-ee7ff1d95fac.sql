-- Create payout_status_history table to track all status changes
CREATE TABLE public.payout_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_id uuid NOT NULL REFERENCES public.payout_requests(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payout_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can view all payout history"
ON public.payout_status_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert payout history"
ON public.payout_status_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own payout history"
ON public.payout_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.payout_requests pr
    WHERE pr.id = payout_status_history.payout_id
    AND pr.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_payout_status_history_payout_id ON public.payout_status_history(payout_id);
CREATE INDEX idx_payout_status_history_created_at ON public.payout_status_history(created_at DESC);