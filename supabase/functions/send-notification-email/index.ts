import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  type: 'new_chat_message' | 'kyc_submitted' | 'payout_request' | 'new_order' | 'support_ticket';
  userId?: string;
  userName?: string;
  userEmail?: string;
  message?: string;
  orderId?: string;
  amount?: number;
  ticketCategory?: string;
  ticketSubject?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Verify the caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create a client with the user's token to verify their identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.log("Authentication failed:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", user.id);

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch settings from platform_settings table
    const { data: settings, error: settingsError } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["resend_api_key", "email_notifications_enabled", "admin_email"]);

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw new Error("Failed to fetch email settings");
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const resendApiKey = settingsMap["resend_api_key"];
    const emailEnabled = settingsMap["email_notifications_enabled"] === "true";
    const adminEmail = settingsMap["admin_email"];

    console.log("Email settings:", { emailEnabled, hasApiKey: !!resendApiKey, hasAdminEmail: !!adminEmail });

    if (!emailEnabled) {
      console.log("Email notifications are disabled");
      return new Response(
        JSON.stringify({ success: false, message: "Email notifications are disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!resendApiKey || !adminEmail) {
      console.log("Missing API key or admin email");
      return new Response(
        JSON.stringify({ success: false, message: "Email settings not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { type, userName, userEmail, message, orderId, amount, ticketCategory, ticketSubject }: NotificationEmailRequest = await req.json();

    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "new_chat_message":
        subject = `New Chat Message from ${userName || "User"}`;
        htmlContent = `
          <h2>New Chat Message</h2>
          <p><strong>From:</strong> ${userName || "User"} (${userEmail || "N/A"})</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
            ${message || "No message content"}
          </blockquote>
        `;
        break;
      case "support_ticket":
        subject = `🎫 New Support Ticket from ${userName || "User"}`;
        htmlContent = `
          <h2 style="color: #2563eb;">New Support Ticket</h2>
          <table style="border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px 15px; background: #f3f4f6; font-weight: bold;">From:</td>
              <td style="padding: 8px 15px;">${userName || "User"} (${userEmail || "N/A"})</td>
            </tr>
            <tr>
              <td style="padding: 8px 15px; background: #f3f4f6; font-weight: bold;">Category:</td>
              <td style="padding: 8px 15px;">${ticketCategory || "General"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 15px; background: #f3f4f6; font-weight: bold;">Subject:</td>
              <td style="padding: 8px 15px;">${ticketSubject || "No Subject"}</td>
            </tr>
          </table>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; background: #eff6ff;">
            ${message || "No message content"}
          </blockquote>
          <p style="margin-top: 20px;">
            <a href="#" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a>
          </p>
        `;
        break;
      case "kyc_submitted":
        subject = `New KYC Submission from ${userName || "User"}`;
        htmlContent = `
          <h2>New KYC Submission</h2>
          <p><strong>User:</strong> ${userName || "User"} (${userEmail || "N/A"})</p>
          <p>A new KYC submission is awaiting review.</p>
        `;
        break;
      case "payout_request":
        subject = `New Payout Request from ${userName || "User"}`;
        htmlContent = `
          <h2>New Payout Request</h2>
          <p><strong>User:</strong> ${userName || "User"} (${userEmail || "N/A"})</p>
          <p><strong>Amount:</strong> $${amount?.toFixed(2) || "0.00"}</p>
        `;
        break;
      case "new_order":
        subject = `New Order Received - ${orderId || "Unknown"}`;
        htmlContent = `
          <h2>New Order Received</h2>
          <p><strong>Order ID:</strong> ${orderId || "Unknown"}</p>
          <p><strong>Affiliate:</strong> ${userName || "User"}</p>
        `;
        break;
      default:
        subject = "Platform Notification";
        htmlContent = `<p>${message || "You have a new notification."}</p>`;
    }

    console.log("Sending email to:", adminEmail);
    
    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Platform <onboarding@resend.dev>",
        to: [adminEmail],
        subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailResponse: emailResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
