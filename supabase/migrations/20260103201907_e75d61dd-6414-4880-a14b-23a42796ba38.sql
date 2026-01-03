-- 1) Expand allowed wallet transaction types to match app usage
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'deposit'::text,
        'payment'::text,
        'refund'::text,
        'order_commission'::text,
        'order_value'::text,
        'payout'::text,
        'payout_approved'::text,
        'payout_completed'::text,
        'payout_refund'::text,
        'payout_reverted'::text,
        'credit'::text,
        'debit'::text,
        'adjustment'::text
      ]
    )
  );

-- 2) Credit FULL order value (selling_price * quantity) when an order becomes completed
CREATE OR REPLACE FUNCTION public.credit_wallet_on_order_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_credit_enabled text;
  order_total numeric;
  already_credited boolean;
BEGIN
  -- Only act when status transitions to 'completed'
  IF (TG_OP = 'UPDATE')
     AND (NEW.status = 'completed')
     AND (OLD.status IS DISTINCT FROM 'completed') THEN

    SELECT value
      INTO auto_credit_enabled
      FROM public.platform_settings
     WHERE key = 'auto_credit_on_complete';

    IF COALESCE(auto_credit_enabled, 'false') <> 'true' THEN
      RETURN NEW;
    END IF;

    -- Idempotency: avoid double-crediting the same order
    SELECT EXISTS (
      SELECT 1
        FROM public.wallet_transactions wt
       WHERE wt.order_id = NEW.id
         AND wt.type = ANY (ARRAY['order_value'::text, 'order_commission'::text])
    ) INTO already_credited;

    IF already_credited THEN
      RETURN NEW;
    END IF;

    order_total := (NEW.selling_price * NEW.quantity);
    order_total := GREATEST(0, COALESCE(order_total, 0));

    IF order_total <= 0 THEN
      RETURN NEW;
    END IF;

    UPDATE public.profiles
       SET wallet_balance = COALESCE(wallet_balance, 0) + order_total
     WHERE user_id = NEW.affiliate_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
    VALUES (
      NEW.affiliate_user_id,
      order_total,
      'order_value',
      'Order value for order ' || NEW.order_number,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;