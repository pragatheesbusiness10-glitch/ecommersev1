-- ============================================
-- AFFLUX DATABASE SCHEMA
-- Complete schema for self-hosted deployment
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE app_role AS ENUM ('admin', 'user');
CREATE TYPE kyc_status AS ENUM ('not_submitted', 'submitted', 'approved', 'rejected');
CREATE TYPE order_status AS ENUM ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE user_level AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'suspended', 'rejected');

-- ============================================
-- TABLES
-- ============================================

-- User Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_status user_status NOT NULL DEFAULT 'pending',
  user_level user_level NOT NULL DEFAULT 'bronze',
  wallet_balance NUMERIC NOT NULL DEFAULT 0.00,
  commission_override NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  storefront_name TEXT,
  storefront_slug TEXT UNIQUE,
  storefront_banner TEXT DEFAULT 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=400&fit=crop',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products (Admin managed)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sku TEXT NOT NULL UNIQUE,
  base_price NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Storefront Products (User's product listings)
CREATE TABLE public.storefront_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  selling_price NUMERIC NOT NULL,
  custom_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  storefront_product_id UUID NOT NULL REFERENCES public.storefront_products(id),
  affiliate_user_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  selling_price NUMERIC NOT NULL,
  base_price NUMERIC NOT NULL,
  status order_status NOT NULL DEFAULT 'pending_payment',
  payment_link TEXT,
  payment_link_clicked_at TIMESTAMPTZ,
  payment_link_updated_by UUID,
  payment_link_updated_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KYC Submissions
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
  bank_statement_url TEXT,
  face_image_url TEXT,
  status kyc_status NOT NULL DEFAULT 'submitted',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wallet Transactions
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payout Requests
CREATE TABLE public.payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat Messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Settings
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID,
  admin_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_storefront_slug ON public.profiles(storefront_slug);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_storefront_products_user_id ON public.storefront_products(user_id);
CREATE INDEX idx_storefront_products_product_id ON public.storefront_products(product_id);
CREATE INDEX idx_orders_affiliate_user_id ON public.orders(affiliate_user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_kyc_submissions_user_id ON public.kyc_submissions(user_id);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_payout_requests_user_id ON public.payout_requests(user_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_platform_settings_key ON public.platform_settings(key);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.order_number = 'ORD-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_approve BOOLEAN;
  initial_status user_status;
BEGIN
  SELECT value::boolean INTO auto_approve 
  FROM public.platform_settings 
  WHERE key = 'auto_user_approval';
  
  IF auto_approve = true THEN
    initial_status := 'approved';
  ELSE
    initial_status := 'pending';
  END IF;

  INSERT INTO public.profiles (user_id, name, email, user_status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email), NEW.email, initial_status);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Get KYC status
CREATE OR REPLACE FUNCTION public.get_kyc_status(_user_id UUID)
RETURNS kyc_status
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT status FROM public.kyc_submissions WHERE user_id = _user_id),
    'not_submitted'::kyc_status
  )
$$;

-- Check if KYC is approved
CREATE OR REPLACE FUNCTION public.is_kyc_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kyc_submissions 
    WHERE user_id = _user_id 
    AND status = 'approved'
  )
$$;

-- Check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND user_status = 'approved'
  )
$$;

-- Get user commission rate
CREATE OR REPLACE FUNCTION public.get_user_commission_rate(_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT commission_override FROM public.profiles WHERE user_id = _user_id),
    (SELECT value::numeric FROM public.platform_settings WHERE key = 'commission_rate'),
    100
  )
$$;

-- Get public storefront profile
CREATE OR REPLACE FUNCTION public.get_public_storefront_profile(_slug TEXT)
RETURNS TABLE(user_id UUID, storefront_name TEXT, storefront_slug TEXT, storefront_banner TEXT, display_name TEXT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.user_id,
    p.storefront_name,
    p.storefront_slug,
    p.storefront_banner,
    p.name as display_name
  FROM public.profiles p
  WHERE p.storefront_slug = _slug
  LIMIT 1
$$;

-- Get affiliate orders with masked customer data
CREATE OR REPLACE FUNCTION public.get_affiliate_orders_masked()
RETURNS TABLE(
  id UUID,
  order_number TEXT,
  status order_status,
  quantity INTEGER,
  selling_price NUMERIC,
  base_price NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  payment_link TEXT,
  payment_link_clicked_at TIMESTAMPTZ,
  storefront_product_id UUID,
  affiliate_user_id UUID,
  customer_name_masked TEXT,
  customer_email_masked TEXT,
  customer_phone_masked TEXT,
  customer_address_masked TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_id UUID;
  is_admin BOOLEAN;
BEGIN
  caller_id := auth.uid();
  
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  is_admin := public.has_role(caller_id, 'admin');
  
  RETURN QUERY
  SELECT 
    o.id,
    o.order_number,
    o.status,
    o.quantity,
    o.selling_price,
    o.base_price,
    o.created_at,
    o.updated_at,
    o.paid_at,
    o.completed_at,
    o.payment_link,
    o.payment_link_clicked_at,
    o.storefront_product_id,
    o.affiliate_user_id,
    CASE 
      WHEN is_admin THEN o.customer_name
      ELSE LEFT(o.customer_name, 1) || '***' || COALESCE(' ' || LEFT(SPLIT_PART(o.customer_name, ' ', 2), 1) || '***', '')
    END as customer_name_masked,
    CASE 
      WHEN is_admin THEN o.customer_email
      ELSE REGEXP_REPLACE(o.customer_email, '^(.{2})[^@]+', '\1***')
    END as customer_email_masked,
    CASE 
      WHEN is_admin THEN o.customer_phone
      WHEN o.customer_phone IS NULL THEN NULL
      ELSE '***-***-' || RIGHT(o.customer_phone, 4)
    END as customer_phone_masked,
    CASE 
      WHEN is_admin THEN o.customer_address
      ELSE '[Address hidden for privacy]'
    END as customer_address_masked
  FROM orders o
  WHERE (is_admin OR o.affiliate_user_id = caller_id);
END;
$$;

-- Create audit log
CREATE OR REPLACE FUNCTION public.create_audit_log(
  _action_type TEXT,
  _entity_type TEXT,
  _entity_id UUID,
  _user_id UUID,
  _admin_id UUID,
  _old_value JSONB DEFAULT NULL,
  _new_value JSONB DEFAULT NULL,
  _reason TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (action_type, entity_type, entity_id, user_id, admin_id, old_value, new_value, reason, metadata)
  VALUES (_action_type, _entity_type, _entity_id, _user_id, _admin_id, _old_value, _new_value, _reason, _metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Protect profile fields from unauthorized updates
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  
  IF NEW.user_status IS DISTINCT FROM OLD.user_status THEN
    RAISE EXCEPTION 'You are not allowed to modify user_status';
  END IF;
  
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'You are not allowed to modify wallet_balance';
  END IF;
  
  IF NEW.commission_override IS DISTINCT FROM OLD.commission_override THEN
    RAISE EXCEPTION 'You are not allowed to modify commission_override';
  END IF;
  
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'You are not allowed to modify is_active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Validate KYC submission
CREATE OR REPLACE FUNCTION public.validate_kyc_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.aadhaar_number !~ '^[0-9]{12}$' THEN
    RAISE EXCEPTION 'Invalid Aadhaar number format. Must be exactly 12 digits.';
  END IF;
  
  IF NEW.pan_number !~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$' THEN
    RAISE EXCEPTION 'Invalid PAN format. Must be 5 uppercase letters, 4 digits, 1 uppercase letter.';
  END IF;
  
  IF NEW.date_of_birth >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Date of birth must be in the past.';
  END IF;
  
  IF NEW.date_of_birth < '1900-01-01'::date THEN
    RAISE EXCEPTION 'Invalid date of birth.';
  END IF;
  
  IF LENGTH(TRIM(NEW.first_name)) < 1 OR LENGTH(NEW.first_name) > 100 THEN
    RAISE EXCEPTION 'First name must be between 1 and 100 characters.';
  END IF;
  
  IF LENGTH(TRIM(NEW.last_name)) < 1 OR LENGTH(NEW.last_name) > 100 THEN
    RAISE EXCEPTION 'Last name must be between 1 and 100 characters.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_storefront_products_updated_at
  BEFORE UPDATE ON public.storefront_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kyc_submissions_updated_at
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Generate order number on insert
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- Protect profile fields
CREATE TRIGGER protect_profile_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- Validate KYC
CREATE TRIGGER validate_kyc_submission_trigger
  BEFORE INSERT OR UPDATE ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_kyc_submission();

-- Handle new user (attach to auth.users in Supabase)
-- Note: Run this separately in Supabase SQL Editor
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile safely" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Products policies
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can view active products" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Storefront products policies
CREATE POLICY "Users can manage their own storefront products" ON public.storefront_products
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all storefront products" ON public.storefront_products
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view active storefront products safely" ON public.storefront_products
  FOR SELECT USING (
    is_active = true AND 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = storefront_products.user_id 
      AND p.is_active = true 
      AND p.user_status = 'approved'
    )
  );

-- Orders policies
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Users can create orders for their products" ON public.orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM storefront_products sp 
      WHERE sp.id = orders.storefront_product_id 
      AND sp.user_id = orders.affiliate_user_id
    )
  );

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Require authentication for orders" ON public.orders
  FOR ALL USING (false) WITH CHECK (false);

-- KYC policies
CREATE POLICY "Users can view their own KYC" ON public.kyc_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can submit KYC" ON public.kyc_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update rejected KYC" ON public.kyc_submissions
  FOR UPDATE USING (auth.uid() = user_id AND status = 'rejected');

CREATE POLICY "Admins can view all KYC" ON public.kyc_submissions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update KYC" ON public.kyc_submissions
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete KYC" ON public.kyc_submissions
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Require authentication for kyc_submissions" ON public.kyc_submissions
  FOR ALL USING (false) WITH CHECK (false);

-- Wallet transactions policies
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Payout requests policies
CREATE POLICY "Users can view their own payout requests" ON public.payout_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payout requests" ON public.payout_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payout requests" ON public.payout_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Chat messages policies
CREATE POLICY "Users can view their own messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id AND sender_role = 'user');

CREATE POLICY "Users can update their messages" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all messages" ON public.chat_messages
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') AND sender_role = 'admin');

CREATE POLICY "Admins can update messages" ON public.chat_messages
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Require authentication for chat_messages" ON public.chat_messages
  FOR ALL USING (false) WITH CHECK (false);

-- Platform settings policies
CREATE POLICY "Public can read non-sensitive settings" ON public.platform_settings
  FOR SELECT USING (
    key NOT LIKE '%_secret%' AND 
    key NOT LIKE '%_key%' AND 
    key NOT LIKE '%_salt%' AND 
    key NOT LIKE '%api_key%'
  );

CREATE POLICY "Admins can read all settings" ON public.platform_settings
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage settings" ON public.platform_settings
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Audit logs policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================
-- DEFAULT PLATFORM SETTINGS
-- ============================================

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('commission_rate', '100', 'Default commission rate for affiliates'),
  ('auto_user_approval', 'false', 'Automatically approve new user registrations'),
  ('minimum_payout_amount', '500', 'Minimum amount for payout requests'),
  ('platform_name', 'Afflux', 'Platform display name')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- ============================================
-- 
-- Create these buckets manually in Supabase Storage:
-- 1. kyc-documents (private)
-- 2. branding (public)
-- 3. videos (public)

-- ============================================
-- AUTH TRIGGER (Run separately in Supabase)
-- ============================================
-- 
-- Run this in Supabase SQL Editor to create the auth trigger:
-- 
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();
