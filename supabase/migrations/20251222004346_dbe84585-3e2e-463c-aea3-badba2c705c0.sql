-- Add user_status enum type
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'disabled');

-- Add user_status and commission_override to profiles
ALTER TABLE public.profiles 
ADD COLUMN user_status public.user_status NOT NULL DEFAULT 'pending',
ADD COLUMN commission_override numeric DEFAULT NULL;

-- Add new platform settings
INSERT INTO public.platform_settings (key, value, description) VALUES
('auto_user_approval', 'false', 'Automatically approve new users on login'),
('default_currency', 'USD', 'System default currency'),
('display_currencies', '["USD","EUR","GBP","INR","AUD","CAD","JPY","CNY","AED","SGD"]', 'Available currencies for display');

-- Create audit_logs table for comprehensive logging
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  user_id uuid,
  admin_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs (for triggers)
CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to get user's effective commission rate
CREATE OR REPLACE FUNCTION public.get_user_commission_rate(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT commission_override FROM public.profiles WHERE user_id = _user_id),
    (SELECT value::numeric FROM public.platform_settings WHERE key = 'commission_rate'),
    100
  )
$$;

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND user_status = 'approved'
  )
$$;

-- Update handle_new_user function to check auto_user_approval setting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auto_approve boolean;
  initial_status user_status;
BEGIN
  -- Check if auto approval is enabled
  SELECT value::boolean INTO auto_approve 
  FROM public.platform_settings 
  WHERE key = 'auto_user_approval';
  
  -- Set initial status based on setting
  IF auto_approve = true THEN
    initial_status := 'approved';
  ELSE
    initial_status := 'pending';
  END IF;

  INSERT INTO public.profiles (user_id, name, email, user_status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email), NEW.email, initial_status);
  
  -- Default role is 'user' for new signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create function to log audit entries
CREATE OR REPLACE FUNCTION public.create_audit_log(
  _action_type text,
  _entity_type text,
  _entity_id uuid,
  _user_id uuid,
  _admin_id uuid,
  _old_value jsonb DEFAULT NULL,
  _new_value jsonb DEFAULT NULL,
  _reason text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (action_type, entity_type, entity_id, user_id, admin_id, old_value, new_value, reason, metadata)
  VALUES (_action_type, _entity_type, _entity_id, _user_id, _admin_id, _old_value, _new_value, _reason, _metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;