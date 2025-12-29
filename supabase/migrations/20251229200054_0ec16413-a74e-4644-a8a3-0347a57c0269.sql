-- Create an RPC function that returns orders with masked customer PII for affiliates
CREATE OR REPLACE FUNCTION public.get_affiliate_orders_masked()
RETURNS TABLE (
  id uuid,
  order_number text,
  status order_status,
  quantity integer,
  selling_price numeric,
  base_price numeric,
  created_at timestamptz,
  updated_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  payment_link text,
  payment_link_clicked_at timestamptz,
  storefront_product_id uuid,
  affiliate_user_id uuid,
  -- Masked customer fields
  customer_name_masked text,
  customer_email_masked text,
  customer_phone_masked text,
  customer_address_masked text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  is_admin boolean;
BEGIN
  caller_id := auth.uid();
  
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user is admin
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
    -- For admins, show full data; for affiliates, mask the data
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
  WHERE 
    -- Admins can see all orders, affiliates only their own
    (is_admin OR o.affiliate_user_id = caller_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_affiliate_orders_masked() TO authenticated;