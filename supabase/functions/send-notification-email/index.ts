import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  type: 
    | 'test_email' 
    | 'new_chat_message' 
    | 'admin_chat_message'
    | 'kyc_submitted' 
    | 'payout_request' 
    | 'new_payout_request_admin'
    | 'new_order' 
    | 'order_status_change'
    | 'admin_new_order'
    | 'support_ticket' 
    | 'affiliate_order_created' 
    | 'payout_approved' 
    | 'payout_rejected' 
    | 'payout_completed';
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
  orderStatus?: string;
  previousStatus?: string;
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

const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
      .in("key", ["resend_api_key", "email_notifications_enabled", "admin_email", "site_name"]);

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
    const siteName = settingsMap["site_name"] || "Platform";

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
    const { type, orderId, orderNumber, amount, orderStatus, previousStatus } = requestData;
    
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
      case "test_email":
        subject = `✅ Test Email from ${siteName}`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">✅ Email Configuration Test Successful!</h2>
            <p>Congratulations! Your email configuration is working correctly.</p>
            
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3 style="margin-top: 0; color: #065f46;">Configuration Details</h3>
              <p style="margin: 10px 0;"><strong>Platform:</strong> ${siteName}</p>
              <p style="margin: 10px 0;"><strong>Admin Email:</strong> ${adminEmail}</p>
              <p style="margin: 10px 0;"><strong>Test Time:</strong> ${new Date().toISOString()}</p>
            </div>
            
            <p>You will now receive email notifications for:</p>
            <ul>
              <li>New orders and order status changes</li>
              <li>Payout requests and status updates</li>
              <li>Chat messages</li>
              <li>Support tickets</li>
              <li>KYC submissions</li>
            </ul>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated test notification from ${siteName}.
            </p>
          </div>
        `;
        break;

      case "new_chat_message":
        subject = `💬 New Chat Message from ${userName}`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">💬 New Chat Message</h2>
            <p><strong>From:</strong> ${userName} (${userEmail})</p>
            <p><strong>Message:</strong></p>
            <blockquote style="border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; background: #eff6ff;">
              ${message}
            </blockquote>
            <p style="margin-top: 20px;">
              <a href="#" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a>
            </p>
          </div>
        `;
        break;

      case "admin_chat_message":
        subject = `💬 Admin Reply to Your Message`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">💬 You Have a Reply!</h2>
            <p>Hello ${userName},</p>
            <p>An admin has responded to your message:</p>
            <blockquote style="border-left: 4px solid #059669; padding: 15px; margin: 15px 0; background: #ecfdf5;">
              ${message}
            </blockquote>
            <p>Log in to your dashboard to continue the conversation.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
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
        subject = `📋 New KYC Submission from ${userName}`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">📋 New KYC Submission</h2>
            <p><strong>User:</strong> ${userName} (${userEmail})</p>
            <p>A new KYC submission is awaiting your review.</p>
            <p style="margin-top: 20px;">
              <a href="#" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review KYC</a>
            </p>
          </div>
        `;
        break;

      case "payout_request":
        subject = `💰 New Payout Request from ${userName}`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">💰 New Payout Request</h2>
            <p><strong>User:</strong> ${userName} (${userEmail})</p>
            <p><strong>Amount:</strong> $${amount?.toFixed(2) || "0.00"}</p>
            <p>Please review this payout request in the admin panel.</p>
          </div>
        `;
        break;

      case "new_payout_request_admin":
        subject = `💰 New Payout Request - $${amount?.toFixed(2) || "0.00"}`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">💰 New Payout Request</h2>
            <p>A new payout request has been submitted and is awaiting your review.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Request Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>User:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${userName} (${userEmail})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                  <td style="padding: 8px 0; font-weight: bold; color: #7c3aed;">$${amount?.toFixed(2) || "0.00"}</td>
                </tr>
              </table>
            </div>
            
            <p style="margin-top: 20px;">
              <a href="#" style="background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Payout Request</a>
            </p>
          </div>
        `;
        break;

      case "new_order":
        subject = `🛒 New Order Received - ${escapeHtml(orderId)}`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">🛒 New Order Received</h2>
            <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
            <p><strong>Affiliate:</strong> ${userName}</p>
          </div>
        `;
        break;

      case "admin_new_order":
        subject = `🛒 New Order Created - ${escapeHtml(orderNumber)}`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">🛒 New Order Created</h2>
            <p>A new order has been created on the platform.</p>
            
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
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Affiliate:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                  <td style="padding: 8px 0; font-weight: bold; color: #059669;">$${amount?.toFixed(2) || "0.00"}</td>
                </tr>
              </table>
            </div>
            
            <p style="margin-top: 20px;">
              <a href="#" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order</a>
            </p>
          </div>
        `;
        break;

      case "order_status_change":
        const statusColor = orderStatus === 'completed' ? '#059669' : 
                           orderStatus === 'cancelled' ? '#dc2626' : 
                           orderStatus === 'processing' ? '#2563eb' : '#f59e0b';
        subject = `📦 Order ${escapeHtml(orderNumber)} Status Updated: ${formatStatus(orderStatus || '')}`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${statusColor};">📦 Order Status Updated</h2>
            <p>Hello ${userName},</p>
            <p>Your order status has been updated.</p>
            
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
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Previous Status:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${formatStatus(previousStatus || 'N/A')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>New Status:</strong></td>
                  <td style="padding: 8px 0; font-weight: bold; color: ${statusColor};">${formatStatus(orderStatus || '')}</td>
                </tr>
              </table>
            </div>
            
            <p>Log in to your dashboard to view the full order details.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
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
        subject = `${siteName} Notification`;
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
      from: `${siteName} <onboarding@resend.dev>`,
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
