const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Public order creation is now disabled - only admin can create orders
  console.log('Public order creation attempted - returning disabled message');
  return new Response(
    JSON.stringify({ 
      error: 'Order creation is disabled. Please contact the affiliate or admin to place your order.',
      disabled: true
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});