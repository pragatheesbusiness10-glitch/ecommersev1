import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, cf-connecting-ip',
};

// List of restricted country codes
const RESTRICTED_COUNTRIES = ['IN']; // India

// Known VPN/Proxy detection indicators
const VPN_INDICATORS = ['vpn', 'proxy', 'tor', 'hosting', 'datacenter'];

interface GeoData {
  country: string;
  countryCode: string;
  isProxy: boolean;
  isVpn: boolean;
  org: string;
}

async function getGeoData(ip: string): Promise<GeoData | null> {
  try {
    // Using ip-api.com free tier for geo detection
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,org,proxy,hosting`);
    const data = await response.json();
    
    if (data.status === 'success') {
      const orgLower = (data.org || '').toLowerCase();
      const isVpnOrProxy = data.proxy || data.hosting || VPN_INDICATORS.some(indicator => orgLower.includes(indicator));
      
      return {
        country: data.country || 'Unknown',
        countryCode: data.countryCode || '',
        isProxy: data.proxy || false,
        isVpn: isVpnOrProxy,
        org: data.org || ''
      };
    }
    return null;
  } catch (error) {
    console.error('Geo lookup error:', error);
    return null;
  }
}

function getClientIp(req: Request): string {
  // Try various headers that might contain the real IP
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIp = req.headers.get('x-real-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIp) return xRealIp;
  
  return '127.0.0.1';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for geo detection
    const clientIp = getClientIp(req);
    console.log('Client IP:', clientIp);
    
    // Get custom error message from platform settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: settingData } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'order_failed_message')
      .maybeSingle();
    
    const customErrorMessage = settingData?.value || 'Order not available in India or you are using VPN, fake order.';
    
    // Perform geo detection
    const geoData = await getGeoData(clientIp);
    console.log('Geo data:', JSON.stringify(geoData));
    
    if (geoData) {
      // Check if from restricted country
      if (RESTRICTED_COUNTRIES.includes(geoData.countryCode)) {
        console.log(`Order blocked - Restricted country: ${geoData.country} (${geoData.countryCode})`);
        return new Response(
          JSON.stringify({ 
            error: customErrorMessage,
            disabled: true,
            reason: 'restricted_region'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check for VPN/Proxy
      if (geoData.isVpn || geoData.isProxy) {
        console.log(`Order blocked - VPN/Proxy detected. Org: ${geoData.org}`);
        return new Response(
          JSON.stringify({ 
            error: customErrorMessage,
            disabled: true,
            reason: 'vpn_detected'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Public order creation is disabled - only admin can create orders
    console.log('Public order creation attempted - returning disabled message');
    return new Response(
      JSON.stringify({ 
        error: customErrorMessage,
        disabled: true,
        reason: 'orders_disabled'
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request.',
        disabled: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
