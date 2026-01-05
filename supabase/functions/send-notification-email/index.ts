import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  type: 'new_chat_message' | 'kyc_submitted' | 'payout_request' | 'new_order' | 'support_ticket' | 'affiliate_order_created' | 'payout_approved' | 'payout_rejected' | 'payout_completed';
  userId?: string;
  userName?: string;
  userEmail?: string;
  message?: string;
  orderId?: string;
  orderNumber?: string;
  amount?: number;
  ticketCategory?: string;
  ticketSubject?: string;
  productName?: string;
  customerName?: string;
  adminNotes?: string;
  recipientEmail?: string;
}

// HTML escape function to prevent XSS in email content
const escapeHtml = (str: string | undefined | null): string => {
  if (!str) return 'N/A';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

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

    console.log("Email settings loaded:", { 
      emailEnabled, 
      hasApiKey: !!resendApiKey, 
      apiKeyLength: resendApiKey?.length || 0,
      apiKeyPrefix: resendApiKey?.substring(0, 10) || 'N/A',
      hasAdminEmail: !!adminEmail,
      adminEmail: adminEmail || 'N/A'
    });

    if (!emailEnabled) {
      console.log("Email notifications are disabled in settings");
      return new Response(
        JSON.stringify({ success: false, message: "Email notifications are disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!resendApiKey) {
      console.error("CRITICAL: Resend API key is missing from platform_settings");
      return new Response(
        JSON.stringify({ success: false, message: "Resend API key not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!adminEmail) {
      console.error("CRITICAL: Admin email is missing from platform_settings");
      return new Response(
        JSON.stringify({ success: false, message: "Admin email not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const requestData: NotificationEmailRequest = await req.json();
    const { type, orderId, orderNumber, amount } = requestData;
    
    // Sanitize all user-provided input to prevent XSS
    const userName = escapeHtml(requestData.userName);
    const userEmail = escapeHtml(requestData.userEmail);
    const message = escapeHtml(requestData.message);
    const ticketCategory = escapeHtml(requestData.ticketCategory);
    const ticketSubject = escapeHtml(requestData.ticketSubject);
    const productName = escapeHtml(requestData.productName);
    const customerName = escapeHtml(requestData.customerName);
    const adminNotes = escapeHtml(requestData.adminNotes);
    const recipientEmail = requestData.recipientEmail;

    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "new_chat_message":
        subject = `New Chat Message from ${userName}`;
        htmlContent = `
          <h2>New Chat Message</h2>
          <p><strong>From:</strong> ${userName} (${userEmail})</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
            ${message}
          </blockquote>
        `;
        break;
      case "support_ticket":
        subject = `🎫 New Support Ticket from ${userName}`;
        htmlContent = `
          <h2 style="color: #2563eb;">New Support Ticket</h2>
          <table style="border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px 15px; background: #f3f4f6; font-weight: bold;">From:</td>
              <td style="padding: 8px 15px;">${userName} (${userEmail})</td>
            </tr>
            <tr>
              <td style="padding: 8px 15px; background: #f3f4f6; font-weight: bold;">Category:</td>
              <td style="padding: 8px 15px;">${ticketCategory || 'General'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 15px; background: #f3f4f6; font-weight: bold;">Subject:</td>
              <td style="padding: 8px 15px;">${ticketSubject || 'No Subject'}</td>
            </tr>
          </table>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; background: #eff6ff;">
            ${message}
          </blockquote>
          <p style="margin-top: 20px;">
            <a href="#" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a>
          </p>
        `;
        break;
      case "kyc_submitted":
        subject = `New KYC Submission from ${userName}`;
        htmlContent = `
          <h2>New KYC Submission</h2>
          <p><strong>User:</strong> ${userName} (${userEmail})</p>
          <p>A new KYC submission is awaiting review.</p>
        `;
        break;
      case "payout_request":
        subject = `New Payout Request from ${userName}`;
        htmlContent = `
          <h2>New Payout Request</h2>
          <p><strong>User:</strong> ${userName} (${userEmail})</p>
          <p><strong>Amount:</strong> $${amount?.toFixed(2) || "0.00"}</p>
        `;
        break;
      case "new_order":
        subject = `New Order Received - ${escapeHtml(orderId)}`;
        htmlContent = `
          <h2>New Order Received</h2>
          <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
          <p><strong>Affiliate:</strong> ${userName}</p>
        `;
        break;
      case "affiliate_order_created":
        subject = `🎉 New Order Created for You - ${escapeHtml(orderNumber)}`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">🎉 Congratulations! A New Order Has Been Created</h2>
            <p>Hello ${userName},</p>
            <p>Great news! An administrator has created a new order for your storefront.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Order Number:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${escapeHtml(orderNumber)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Product:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${productName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                  <td style="padding: 8px 0; font-weight: bold; color: #059669;">$${amount?.toFixed(2) || "0.00"}</td>
                </tr>
              </table>
            </div>
            
            <p>You can view the full order details in your dashboard.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        `;
        break;
      case "payout_approved":
        subject = `✅ Your Payout Request Has Been Approved`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">✅ Payout Approved!</h2>
            <p>Hello ${userName},</p>
            <p>Great news! Your payout request has been approved and is being processed.</p>
            
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3 style="margin-top: 0; color: #065f46;">Payout Details</h3>
              <p style="margin: 10px 0;"><strong>Amount:</strong> <span style="font-size: 18px; color: #059669;">$${amount?.toFixed(2) || "0.00"}</span></p>
              ${adminNotes !== 'N/A' ? `<p style="margin: 10px 0;"><strong>Notes:</strong> ${adminNotes}</p>` : ''}
            </div>
            
            <p>Your payment will be processed shortly. You'll receive another notification once the payment is completed.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        `;
        break;
      case "payout_rejected":
        subject = `❌ Your Payout Request Was Rejected`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">❌ Payout Request Rejected</h2>
            <p>Hello ${userName},</p>
            <p>Unfortunately, your payout request has been rejected.</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin-top: 0; color: #991b1b;">Payout Details</h3>
              <p style="margin: 10px 0;"><strong>Amount:</strong> $${amount?.toFixed(2) || "0.00"}</p>
              ${adminNotes !== 'N/A' ? `<p style="margin: 10px 0;"><strong>Reason:</strong> ${adminNotes}</p>` : ''}
            </div>
            
            <p>The funds have been returned to your wallet balance. If you have questions about this decision, please contact support.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        `;
        break;
      case "payout_completed":
        subject = `🎉 Your Payout Has Been Completed`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">🎉 Payout Completed!</h2>
            <p>Hello ${userName},</p>
            <p>Your payout has been successfully processed and sent to your account.</p>
            
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3 style="margin-top: 0; color: #065f46;">Payment Details</h3>
              <p style="margin: 10px 0;"><strong>Amount Sent:</strong> <span style="font-size: 18px; color: #059669;">$${amount?.toFixed(2) || "0.00"}</span></p>
              ${adminNotes !== 'N/A' ? `<p style="margin: 10px 0;"><strong>Notes:</strong> ${adminNotes}</p>` : ''}
            </div>
            
            <p>The payment should arrive in your account within the standard processing time for your payment method.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        `;
        break;
      default:
        subject = "Platform Notification";
        htmlContent = `<p>${message}</p>`;
    }
    
    // Determine recipient - use recipientEmail for user notifications, adminEmail for admin notifications
    const toEmail = recipientEmail || adminEmail;

    console.log("Preparing to send email:", {
      to: toEmail,
      subject: subject,
      type: type,
      apiKeyValid: resendApiKey?.startsWith('re_')
    });
    
    // Send email using Resend API directly
    const emailPayload = {
      from: "Platform <onboarding@resend.dev>",
      to: [toEmail],
      subject,
      html: htmlContent,
    };
    
    console.log("Resend API request payload:", JSON.stringify(emailPayload, null, 2));

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResult = await emailResponse.json();
    
    console.log("Resend API response status:", emailResponse.status);
    console.log("Resend API response body:", JSON.stringify(emailResult, null, 2));

    if (!emailResponse.ok) {
      console.error("Resend API error - Status:", emailResponse.status, "Body:", JSON.stringify(emailResult));
      
      // Provide more specific error messages based on Resend error codes
      let userMessage = "Failed to send email";
      if (emailResult.statusCode === 401 || emailResult.message?.includes('API key')) {
        userMessage = "Invalid Resend API key. Please check your API key in settings.";
      } else if (emailResult.message?.includes('domain')) {
        userMessage = "Domain not verified in Resend. Use a verified domain or send to your Resend account email.";
      } else if (emailResult.message) {
        userMessage = emailResult.message;
      }
      
      return new Response(
        JSON.stringify({ success: false, error: userMessage, details: emailResult }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully! ID:", emailResult.id);

    return new Response(
      JSON.stringify({ success: true, emailResponse: emailResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Unhandled error in send-notification-email function:", error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
