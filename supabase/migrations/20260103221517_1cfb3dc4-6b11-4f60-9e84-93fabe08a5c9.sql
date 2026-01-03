-- Allow admins to insert force logout events
CREATE POLICY "Admins can insert force logout events"
ON public.force_logout_events
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));