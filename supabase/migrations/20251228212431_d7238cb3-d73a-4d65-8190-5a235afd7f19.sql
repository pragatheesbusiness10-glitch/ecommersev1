-- Remove the dangerous public INSERT policy that allows anyone to create orders
DROP POLICY IF EXISTS "Public can create orders only" ON public.orders;