import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  user_id: string;
  name: string;
  email: string;
  wallet_balance: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting auto-payout processing...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if auto-payout is enabled
    const { data: autoPayoutSetting } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "auto_payout_enabled")
      .single();

    if (!autoPayoutSetting || autoPayoutSetting.value !== "true") {
      console.log("Auto-payout is disabled. Skipping.");
      return new Response(
        JSON.stringify({ success: true, message: "Auto-payout is disabled", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get threshold setting
    const { data: thresholdSetting } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "auto_payout_threshold")
      .single();

    const threshold = parseFloat(thresholdSetting?.value || "1000");
    console.log(`Auto-payout threshold: $${threshold}`);

    // Find users with KYC approved and wallet balance >= threshold
    // First get approved KYC users
    const { data: approvedKYC } = await supabase
      .from("kyc_submissions")
      .select("user_id")
      .eq("status", "approved");

    if (!approvedKYC || approvedKYC.length === 0) {
      console.log("No users with approved KYC found.");
      return new Response(
        JSON.stringify({ success: true, message: "No eligible users", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const approvedUserIds = approvedKYC.map((k) => k.user_id);

    // Get profiles with sufficient balance
    const { data: eligibleProfiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, name, email, wallet_balance")
      .in("user_id", approvedUserIds)
      .gte("wallet_balance", threshold)
      .eq("user_status", "approved");

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }

    if (!eligibleProfiles || eligibleProfiles.length === 0) {
      console.log("No users with sufficient balance found.");
      return new Response(
        JSON.stringify({ success: true, message: "No users with sufficient balance", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${eligibleProfiles.length} eligible users for auto-payout`);

    let processedCount = 0;
    const results: { userId: string; amount: number; status: string }[] = [];

    for (const profile of eligibleProfiles as Profile[]) {
      // Check if there's already a pending payout request for this user
      const { data: existingPayout } = await supabase
        .from("payout_requests")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("status", "pending")
        .limit(1);

      if (existingPayout && existingPayout.length > 0) {
        console.log(`User ${profile.user_id} already has a pending payout request. Skipping.`);
        results.push({
          userId: profile.user_id,
          amount: profile.wallet_balance,
          status: "skipped_pending_exists",
        });
        continue;
      }

      // Create automatic payout request
      const payoutAmount = profile.wallet_balance;
      
      const { error: payoutError } = await supabase.from("payout_requests").insert({
        user_id: profile.user_id,
        amount: payoutAmount,
        payment_method: "bank_transfer",
        payment_details: {
          auto_generated: true,
          generated_at: new Date().toISOString(),
          reason: `Automatic payout - balance exceeded threshold of $${threshold}`,
        },
        status: "pending",
      });

      if (payoutError) {
        console.error(`Error creating payout for user ${profile.user_id}:`, payoutError);
        results.push({
          userId: profile.user_id,
          amount: payoutAmount,
          status: "error",
        });
        continue;
      }

      // Create wallet transaction for the pending payout
      await supabase.from("wallet_transactions").insert({
        user_id: profile.user_id,
        amount: -payoutAmount,
        type: "payout_pending",
        description: `Automatic payout request - $${payoutAmount.toFixed(2)}`,
      });

      // Update wallet balance
      await supabase
        .from("profiles")
        .update({ wallet_balance: 0 })
        .eq("user_id", profile.user_id);

      console.log(`Created auto-payout request for user ${profile.user_id}: $${payoutAmount}`);
      
      processedCount++;
      results.push({
        userId: profile.user_id,
        amount: payoutAmount,
        status: "created",
      });

      // Send notification email to user
      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            type: "payout_created",
            userName: profile.name,
            userEmail: profile.email,
            amount: payoutAmount,
          },
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }

    console.log(`Auto-payout processing complete. Processed: ${processedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} auto-payouts`,
        processed: processedCount,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in auto-payout processing:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
