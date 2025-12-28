import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderRequest {
  storefront_product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address: string;
  quantity?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: OrderRequest = await req.json();
    console.log('Received order request:', JSON.stringify(body));

    // Validate required fields
    if (!body.storefront_product_id || !body.customer_name || !body.customer_email || !body.customer_address) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: storefront_product_id, customer_name, customer_email, customer_address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customer_email)) {
      console.error('Invalid email format:', body.customer_email);
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate customer name length
    if (body.customer_name.length < 2 || body.customer_name.length > 100) {
      console.error('Invalid customer name length');
      return new Response(
        JSON.stringify({ error: 'Customer name must be between 2 and 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate address length
    if (body.customer_address.length < 10 || body.customer_address.length > 500) {
      console.error('Invalid address length');
      return new Response(
        JSON.stringify({ error: 'Address must be between 10 and 500 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate quantity
    const quantity = body.quantity || 1;
    if (quantity < 1 || quantity > 100) {
      console.error('Invalid quantity:', quantity);
      return new Response(
        JSON.stringify({ error: 'Quantity must be between 1 and 100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the storefront product with validation
    console.log('Fetching storefront product:', body.storefront_product_id);
    const { data: storefrontProduct, error: productError } = await supabase
      .from('storefront_products')
      .select(`
        id,
        user_id,
        selling_price,
        is_active,
        product_id
      `)
      .eq('id', body.storefront_product_id)
      .eq('is_active', true)
      .single();

    if (productError || !storefrontProduct) {
      console.error('Storefront product not found or inactive:', productError);
      return new Response(
        JSON.stringify({ error: 'Product not found or unavailable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the base product separately
    const { data: baseProduct, error: baseProductError } = await supabase
      .from('products')
      .select('id, base_price, is_active, stock')
      .eq('id', storefrontProduct.product_id)
      .single();

    if (baseProductError || !baseProduct) {
      console.error('Base product not found:', baseProductError);
      return new Response(
        JSON.stringify({ error: 'Product not found or unavailable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the product is active and in stock
    if (!baseProduct.is_active) {
      console.error('Base product is inactive');
      return new Response(
        JSON.stringify({ error: 'Product is currently unavailable' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (baseProduct.stock < quantity) {
      console.error('Insufficient stock:', baseProduct.stock, 'requested:', quantity);
      return new Response(
        JSON.stringify({ error: 'Insufficient stock for requested quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that the affiliate user is approved
    console.log('Validating affiliate user:', storefrontProduct.user_id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_active, user_status')
      .eq('user_id', storefrontProduct.user_id)
      .single();

    if (profileError || !profile || !profile.is_active || profile.user_status !== 'approved') {
      console.error('Affiliate user is not approved or inactive:', profileError);
      return new Response(
        JSON.stringify({ error: 'This storefront is currently unavailable' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate order number
    const orderNumber = 'ORD-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // Create the order
    console.log('Creating order with number:', orderNumber);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        storefront_product_id: body.storefront_product_id,
        affiliate_user_id: storefrontProduct.user_id,
        customer_name: body.customer_name.trim(),
        customer_email: body.customer_email.trim().toLowerCase(),
        customer_phone: body.customer_phone?.trim() || null,
        customer_address: body.customer_address.trim(),
        quantity: quantity,
        selling_price: storefrontProduct.selling_price,
        base_price: baseProduct.base_price,
        order_number: orderNumber,
        status: 'pending_payment',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Failed to create order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created successfully:', order.id);
    return new Response(
      JSON.stringify({ 
        success: true, 
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total: order.selling_price * order.quantity
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
