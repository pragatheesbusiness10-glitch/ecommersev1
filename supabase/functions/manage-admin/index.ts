import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // SECURITY: Verify caller is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Check if caller is an admin
    const { data: callerRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || callerRole?.role !== 'admin') {
      console.error("Caller is not admin. User:", user.id, "Role:", callerRole?.role);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, action } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!action || !['promote', 'demote'].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'promote' or 'demote'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user profile by email
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("user_id, name")
      .eq("email", email)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("User not found:", email, profileError?.message);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-demotion
    if (action === "demote" && profile.user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot demote yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newRole = action === "promote" ? "admin" : "user";

    // Update user role
    const { error: updateError } = await supabaseClient
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", profile.user_id);

    if (updateError) {
      console.error("Failed to update role:", updateError.message);
      return new Response(
        JSON.stringify({ error: "Failed to update role", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the admin action for audit
    console.log(`Admin action: ${user.email} (${user.id}) ${action}d ${profile.name} (${profile.user_id}) to ${newRole}`);

    // Create audit log entry
    try {
      await supabaseClient.from("audit_logs").insert({
        admin_id: user.id,
        user_id: profile.user_id,
        action_type: action === "promote" ? "promote_to_admin" : "demote_to_user",
        entity_type: "user_role",
        entity_id: profile.user_id,
        old_value: { role: action === "promote" ? "user" : "admin" },
        new_value: { role: newRole },
        metadata: { target_email: email }
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Don't fail the request if audit logging fails
    }

    const actionVerb = action === "promote" ? "promoted to admin" : "demoted to user";
    return new Response(
      JSON.stringify({ success: true, message: `${profile.name} has been ${actionVerb}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Unexpected error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
