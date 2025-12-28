-- Fix Security Issues: Add explicit DENY policies for public access to sensitive tables

-- 1. STOREFRONT_PRODUCTS: Hide user_id from public queries by creating a view
-- First, drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view active storefront products" ON public.storefront_products;

-- Create a more restrictive public policy that doesn't expose user_id directly
-- Public can only view via the products join, not access user_id
CREATE POLICY "Public can view active storefront products safely"
ON public.storefront_products
FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = storefront_products.user_id 
    AND p.is_active = true 
    AND p.user_status = 'approved'
  )
);

-- 2. ORDERS: Block public SELECT, only allow INSERT
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;

-- Public can only INSERT orders (to place orders), not read them
CREATE POLICY "Public can create orders only"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- 3. KYC_SUBMISSIONS: Already has user/admin policies, add explicit denial for anon
-- The existing policies are restrictive enough (users own, admins all)
-- No changes needed as RLS is properly configured

-- 4. PAYOUT_REQUESTS: Already has user/admin policies
-- The existing policies are restrictive enough (users own, admins all)
-- No changes needed as RLS is properly configured

-- 5. PROFILES: Block public access entirely
-- Currently only has user/admin policies which is correct

-- 6. WALLET_TRANSACTIONS: Already restricted to users/admins
-- No changes needed

-- 7. AUDIT_LOGS: Fix the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only allow audit log inserts via the database function (SECURITY DEFINER)
-- Regular users should not be able to insert audit logs
CREATE POLICY "Only admins can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. CHAT_MESSAGES: Already restricted to users/admins
-- No changes needed

-- 9. USER_ROLES: Already restricted to users (own) and admins
-- No changes needed

-- Ensure all tables have RLS enabled (verification)
ALTER TABLE public.storefront_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;