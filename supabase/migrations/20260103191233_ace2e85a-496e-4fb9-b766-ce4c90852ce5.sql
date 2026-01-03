-- Drop the old check constraint and add a new one with order_commission
ALTER TABLE public.wallet_transactions DROP CONSTRAINT wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type = ANY (ARRAY['deposit'::text, 'payment'::text, 'refund'::text, 'order_commission'::text, 'payout'::text, 'credit'::text, 'debit'::text, 'adjustment'::text]));