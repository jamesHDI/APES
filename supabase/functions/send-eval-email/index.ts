// supabase/functions/send-eval-email/index.ts
// Deno-based Supabase Edge Function
// Sends evaluation deployment notification emails to Outlook, Gmail, or any corporate inbox via Gmail SMTP (Nodemailer).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";

const APP_URL = "https://apes-eosin.vercel.app/";

interface EmailRecipient {
  name: string;
  email: string;
}

interface EvalEmailPayload {
  recipients: EmailRecipient[];
  deploymentTitle: string;
  period: string;
  deadline: string;
  deployedBy: string;
}

function buildPlainText(recipient: EmailRecipient, payload: EvalEmailPayload): string {
  const { deploymentTitle, period, deadline, deployedBy } = payload;
  const formattedDeadline = new Date(deadline).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  return `Hello ${recipient.name},

A new performance evaluation cycle has been deployed in APES (Automated Performance Evaluation System) and you are one of the assigned participants.

Evaluation Details:
- Evaluation: ${deploymentTitle}
- Period: ${period}
- Deadline: ${formattedDeadline}
- Deployed By: ${deployedBy}

Please log in to APES to complete your evaluation:
${APP_URL}

--
This is an automated notification from APES. Please do not reply directly to this email.`;
}

function buildEmailHtml(recipient: EmailRecipient, payload: EvalEmailPayload): string {
  const { deploymentTitle, period, deadline, deployedBy } = payload;
  const formattedDeadline = new Date(deadline).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>New Performance Evaluation Deployed</title>
<style>
body{margin:0;padding:0;background:#f5f5f5;font-family:"Segoe UI",Arial,sans-serif}
.wrapper{width:100%;background:#f5f5f5;padding:32px 0}
.card{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.header{background:linear-gradient(135deg,#F28C28,#E96B1A);padding:32px 40px}
.header h1{color:#fff;font-size:22px;font-weight:700;margin:0 0 4px;letter-spacing:.3px}
.header p{color:rgba(255,255,255,.85);font-size:14px;margin:0}
.badge{display:inline-block;background:rgba(255,255,255,.25);color:#fff;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:.8px;text-transform:uppercase;margin-bottom:10px}
.body{padding:36px 40px}
.greeting{font-size:16px;color:#1a1a1a;margin-bottom:16px}
.intro{font-size:14px;color:#555;line-height:1.7;margin-bottom:28px}
.info-box{background:#fff9f3;border:1px solid #fde0c0;border-radius:8px;padding:20px 24px;margin-bottom:28px}
.info-row{margin-bottom:10px;font-size:14px;display:flex}
.info-row:last-child{margin-bottom:0}
.info-label{color:#888;min-width:120px;font-weight:500}
.info-value{color:#1a1a1a;font-weight:600}
.deadline-value{color:#E96B1A;font-weight:700}
.cta-wrap{text-align:center;margin-bottom:28px}
.cta-btn{display:inline-block;background:linear-gradient(135deg,#F28C28,#E96B1A);color:#fff !important;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;letter-spacing:.3px}
.note{font-size:13px;color:#888;line-height:1.6;padding:16px;background:#f8f8f8;border-radius:8px}
.footer{background:#fafafa;border-top:1px solid #eee;padding:20px 40px;text-align:center}
.footer p{font-size:12px;color:#aaa;margin:4px 0}
.footer strong{color:#F28C28}
</style>
</head>
<body>
<div class="wrapper">
<div class="card">
<div class="header">
  <div class="badge">Action Required</div>
  <h1>New Performance Evaluation Deployed</h1>
  <p>APES - Automated Performance Evaluation System</p>
</div>
<div class="body">
  <p class="greeting">Hello, <strong>${recipient.name}</strong>!</p>
  <p class="intro">A new performance evaluation cycle has been deployed and you are one of the assigned participants. Please log in to <strong>APES</strong> at your earliest convenience to complete your evaluation before the deadline.</p>
  <div class="info-box">
    <div class="info-row"><span class="info-label">Evaluation:</span><span class="info-value">${deploymentTitle}</span></div>
    <div class="info-row"><span class="info-label">Period:</span><span class="info-value">${period}</span></div>
    <div class="info-row"><span class="info-label">Deadline:</span><span class="deadline-value">&#9888; ${formattedDeadline}</span></div>
    <div class="info-row"><span class="info-label">Deployed by:</span><span class="info-value">${deployedBy}</span></div>
  </div>
  <div class="cta-wrap"><a href="${APP_URL}" class="cta-btn" style="color:#ffffff;">Open APES &amp; Start Evaluation</a></div>
  <div class="note">Tip: Log in using your employee credentials. Navigate to <em>My Evaluations</em> to find this campaign and submit your self-assessment before the deadline.</div>
</div>
<div class="footer">
  <p>This is an automated message from <strong>APES</strong>.</p>
  <p>Please do not reply directly to this email.</p>
</div>
</div>
</div>
</body>
</html>`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SMTP_USER = Deno.env.get("SMTP_USER") || Deno.env.get("GMAIL_USER");
  const SMTP_PASS = Deno.env.get("SMTP_PASS") || Deno.env.get("GMAIL_APP_PASSWORD");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!SMTP_USER && !RESEND_API_KEY) {
    console.error("[send-eval-email] Neither SMTP_USER nor RESEND_API_KEY is configured.");
    return new Response(JSON.stringify({ error: "Email credentials not configured in Supabase Secrets." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: EvalEmailPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { recipients } = payload;
  if (!recipients || recipients.length === 0) {
    return new Response(JSON.stringify({ error: "No recipients provided" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let transporter: any = null;
  if (SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS.replace(/\s+/g, ""), // strip any spaces from 16-char app passwords
      },
    });
  }

  let sent = 0, failed = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    if (!recipient.email || !recipient.email.includes("@")) {
      console.warn(`[send-eval-email] Skipping invalid email: ${recipient.email}`);
      failed++;
      continue;
    }

    const senderName = Deno.env.get("FROM_NAME") || "APES System";
    const fromAddress = `"${senderName}" <${SMTP_USER || "noreply@hdiadventures.com"}>`;

    try {
      if (transporter) {
        // Send via Gmail SMTP (Direct to Outlook, Gmail, Yahoo, etc.)
        await transporter.sendMail({
          from: fromAddress,
          to: recipient.email,
          subject: `[Action Required] New Performance Evaluation: ${payload.deploymentTitle}`,
          text: buildPlainText(recipient, payload),
          html: buildEmailHtml(recipient, payload),
        });
        sent++;
        console.log(`[send-eval-email] [SMTP] Sent successfully to ${recipient.email}`);
      } else if (RESEND_API_KEY) {
        // Fallback to Resend API
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "APES System <onboarding@resend.dev>",
            to: [recipient.email],
            subject: `[Action Required] New Performance Evaluation: ${payload.deploymentTitle}`,
            html: buildEmailHtml(recipient, payload),
          }),
        });
        if (res.ok) {
          sent++;
          console.log(`[send-eval-email] [Resend] Sent to ${recipient.email}`);
        } else {
          const errText = await res.text();
          failed++;
          errors.push(`${recipient.email}: ${errText}`);
        }
      }
    } catch (err: any) {
      console.error(`[send-eval-email] Failed for ${recipient.email}:`, err);
      failed++;
      errors.push(`${recipient.email}: ${String(err?.message || err)}`);
    }
  }

  return new Response(JSON.stringify({ sent, failed, errors: errors.slice(0, 10) }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

