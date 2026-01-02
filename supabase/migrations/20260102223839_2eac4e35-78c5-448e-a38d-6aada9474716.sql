-- Add updated_at column to payout_requests table
ALTER TABLE public.payout_requests 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger for automatic timestamp updates on payout_requests
DROP TRIGGER IF EXISTS update_payout_requests_updated_at ON public.payout_requests;

CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();