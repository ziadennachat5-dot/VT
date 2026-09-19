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
    const { paypal_order_id } = await req.json();

    if (!paypal_order_id) {
      throw new Error('Missing paypal_order_id');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get order from DB
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('paypal_order_id', paypal_order_id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (order.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ order_number: order.order_number }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID');
    const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const PAYPAL_ENV = Deno.env.get('PAYPAL_ENV') || 'sandbox';
    
    const paypalApiUrl = PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    
    // Get PayPal Access Token
    const tokenRes = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) throw new Error('Failed to get PayPal token');
    const { access_token } = await tokenRes.json();

    // Capture Order
    const captureRes = await fetch(`${paypalApiUrl}/v2/checkout/orders/${paypal_order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureRes.ok) {
      throw new Error('Failed to capture PayPal order');
    }

    const captureData = await captureRes.json();
    
    if (captureData.status !== 'COMPLETED') {
      throw new Error('PayPal order not completed');
    }

    // Verify amount
    const purchaseUnit = captureData.purchase_units[0];
    const captureTotal = parseFloat(purchaseUnit.payments.captures[0].amount.value);
    const captureCurrency = purchaseUnit.payments.captures[0].amount.currency_code;

    if (captureCurrency !== 'USD' || captureTotal !== parseFloat(order.total.toString())) {
      throw new Error('Captured amount or currency mismatch');
    }

    const payer_email = captureData.payer?.email_address;
    const paypal_transaction_id = purchaseUnit.payments.captures[0].id;

    // Update order in DB
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        status: 'paid', // Update main status to paid as well based on previous flow
        payment_status: 'paid',
        paypal_transaction_id,
        payer_email
      })
      .eq('id', order.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ order_number: order.order_number }),
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
