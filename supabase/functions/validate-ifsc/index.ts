import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ifsc } = await req.json();
    
    if (!ifsc) {
      console.log('IFSC validation failed: No IFSC code provided');
      return new Response(
        JSON.stringify({ valid: false, error: 'IFSC code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate IFSC format first
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscPattern.test(ifsc.toUpperCase())) {
      console.log(`IFSC validation failed: Invalid format for ${ifsc}`);
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid IFSC format' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Razorpay IFSC API (free, no API key needed)
    console.log(`Validating IFSC: ${ifsc}`);
    const response = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
    
    if (!response.ok) {
      console.log(`IFSC validation failed: Bank not found for ${ifsc}`);
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid IFSC code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bankData = await response.json();
    console.log(`IFSC validation successful: ${bankData.BANK} - ${bankData.BRANCH}`);
    
    return new Response(
      JSON.stringify({
        valid: true,
        bank: bankData.BANK,
        branch: bankData.BRANCH,
        city: bankData.CITY,
        state: bankData.STATE,
        address: bankData.ADDRESS,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('IFSC validation error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Failed to validate IFSC' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
