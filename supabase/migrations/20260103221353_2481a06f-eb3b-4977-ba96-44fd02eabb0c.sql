-- Create table to track force logout events
CREATE TABLE public.force_logout_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  triggered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.force_logout_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own logout events
CREATE POLICY "Users can view their own logout events"
ON public.force_logout_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only system/admins can insert (via service role in edge function)
-- No INSERT policy for regular users

-- Enable realtime for force_logout_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.force_logout_events;