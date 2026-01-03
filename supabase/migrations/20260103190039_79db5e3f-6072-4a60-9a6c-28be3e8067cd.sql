-- Credit affiliate wallet automatically when an order is marked completed (server-side, idempotent)

CREATE OR REPLACE FUNCTION public.credit_wallet_on_order_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auto_credit_enabled text;
  commission_type text;
  rate numeric;
  profit numeric;
  commission numeric;
  already_credited boolean;
BEGIN
  -- Only act when status transitions to 'completed'
  IF (TG_OP = 'UPDATE') AND (NEW.status = 'completed') AND (OLD.status IS DISTINCT FROM 'completed') THEN
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
         AND wt.type = 'order_commission'
    ) INTO already_credited;

    IF already_credited THEN
      RETURN NEW;
    END IF;

    SELECT value
      INTO commission_type
      FROM public.platform_settings
     WHERE key = 'commission_type';

    rate := public.get_user_commission_rate(NEW.affiliate_user_id);

    profit := (NEW.selling_price - NEW.base_price) * NEW.quantity;

    IF COALESCE(commission_type, 'percentage') = 'fixed' THEN
      -- rate is stored in cents per unit
      commission := (rate / 100) * NEW.quantity;
    ELSE
      -- percentage of profit
      commission := (profit * rate) / 100;
    END IF;

    commission := GREATEST(0, COALESCE(commission, 0));

    -- Skip if nothing to credit
    IF commission <= 0 THEN
      RETURN NEW;
    END IF;

    UPDATE public.profiles
       SET wallet_balance = COALESCE(wallet_balance, 0) + commission
     WHERE user_id = NEW.affiliate_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
    VALUES (
      NEW.affiliate_user_id,
      commission,
      'order_commission',
      'Commission for order ' || NEW.order_number,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_wallet_on_order_completed ON public.orders;

CREATE TRIGGER trg_credit_wallet_on_order_completed
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
EXECUTE FUNCTION public.credit_wallet_on_order_completed();
