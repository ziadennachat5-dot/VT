import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-password, X-Admin-Password',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = (req.headers.get('x-admin-password') || req.headers.get('X-Admin-Password') || '').trim();
    
    // Verify admin password
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');
    if (!adminPassword || token !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, payload } = await req.json();
    
    const rawUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim();
    const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    const supabaseServiceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    let result = null;

    if (action === 'get_orders') {
      const { data, error } = await supabaseClient
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      result = data;
    } 
    else if (action === 'update_order_status') {
      const { id, status } = payload;
      const { data, error } = await supabaseClient
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select();
      if (error) throw error;
      result = data;
    }
    else if (action === 'get_products') {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      result = data;
    }
    else if (action === 'upsert_product') {
      const { data, error } = await supabaseClient
        .from('products')
        .upsert(payload)
        .select();
      if (error) throw error;
      result = data;
    }
    else if (action === 'delete_product') {
      const { id } = payload;
      const { data, error } = await supabaseClient
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      result = data;
    }
    else if (action === 'upload_image') {
      const { fileName, fileType, fileData } = payload;
      // fileData is expected to be a base64 string
      const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const { data, error } = await supabaseClient.storage
        .from('watch-images')
        .upload(fileName, buffer, {
          contentType: fileType,
          upsert: true
        });
        
      if (error) throw error;
      
      const { data: { publicUrl } } = supabaseClient.storage
        .from('watch-images')
        .getPublicUrl(fileName);
        
      result = { publicUrl };
    }
    else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error?.message || error?.details || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
