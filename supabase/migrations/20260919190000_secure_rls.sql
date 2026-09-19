-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products: Allow public to SELECT active products only
DROP POLICY IF EXISTS "Allow public SELECT on active products" ON products;
CREATE POLICY "Allow public SELECT on active products" 
ON products FOR SELECT 
TO public
USING (is_active = true);

-- Note: No policies are created for 'orders' or 'order_items'
-- This ensures a strict DEFAULT DENY for all anonymous access.
-- All inserts and updates for orders/products are securely handled 
-- via Edge Functions ('create-paypal-order' and 'admin-api') 
-- which bypass RLS using the Service Role Key.
