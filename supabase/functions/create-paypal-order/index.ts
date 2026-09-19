import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cartItems, customerDetails } = await req.json();

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Validate customer details
    const { customer_name, phone, email, address_line, city, state, zip } = customerDetails;
    if (!customer_name || !phone || !email || !address_line || !city || !state || !zip) {
      throw new Error('Missing customer details');
    }
    if (phone.replace(/\D/g, '').length < 10) throw new Error('Invalid phone');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Invalid email');
    if (!/^\d{5}$/.test(zip)) throw new Error('Invalid ZIP');

    // Init Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let subtotal = 0;
    const orderItemsToInsert = [];

    // Calculate total from DB
    for (const item of cartItems) {
      if (!item.id || !item.quantity || item.quantity < 1 || item.quantity > 10 || !Number.isInteger(item.quantity)) {
        throw new Error('Invalid cart item');
      }

      const { data: product, error: productError } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', item.id)
        .single();

      if (productError || !product || !product.is_active) {
        throw new Error(`Product not found or inactive: ${item.id}`);
      }

      subtotal += product.price * item.quantity;
      orderItemsToInsert.push({
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: item.quantity
      });
    }

    const shipping = 0;
    const total = subtotal + shipping;

    // Get PayPal Access Token
    const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID');
    const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const PAYPAL_ENV = Deno.env.get('PAYPAL_ENV') || 'sandbox';
    
    const paypalApiUrl = PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    const tokenRes = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      throw new Error('Failed to get PayPal token');
    }
    const { access_token } = await tokenRes.json();

    // Create PayPal Order
    const orderRes = await fetch(`${paypalApiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: total.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: 'USD',
                  value: subtotal.toFixed(2),
                }
              }
            }
          }
        ]
      })
    });

    if (!orderRes.ok) {
      throw new Error('Failed to create PayPal order');
    }
    const paypalOrder = await orderRes.json();

    // Insert pending order in DB
    const orderNumber = 'VT-' + Math.floor(100000 + Math.random() * 900000);
    
    const { data: newOrder, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name,
        phone,
        email,
        address_line,
        city,
        state,
        zip,
        notes: customerDetails.notes || '',
        subtotal,
        shipping,
        total,
        status: 'pending',
        payment_status: 'pending',
        paypal_order_id: paypalOrder.id
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItemsToInsert.map(item => ({ ...item, order_id: newOrder.id })));

    if (itemsError) throw itemsError;

    return new Response(
      JSON.stringify({ paypal_order_id: paypalOrder.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
