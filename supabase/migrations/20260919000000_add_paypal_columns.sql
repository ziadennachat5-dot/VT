ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS paypal_order_id text,
ADD COLUMN IF NOT EXISTS paypal_transaction_id text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payer_email text;
