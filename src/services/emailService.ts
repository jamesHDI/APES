/**
 * emailService.ts
 * Calls the Supabase Edge Function "send-eval-email" to send Outlook / inbox
 * notifications when POD deploys a new evaluation campaign.
 * The actual email delivery is handled server-side via Resend API.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { isDevTestingModeActive, recordDevAction } from './devTestingService';

export interface EvalEmailRecipient {
  name: string;
  email: string;
}

export interface EvalEmailPayload {
  recipients: EvalEmailRecipient[];
  deploymentTitle: string;
  period: string;
  deadline: string;
  deployedBy: string;
}

/**
 * Sends deployment notification emails to all assigned employees.
 * Silently no-ops when Supabase is not configured (local dev / demo mode).
 *
 * @returns An object with { sent, failed, errors } counts, or null if skipped.
 */
export async function sendEvaluationDeploymentEmail(
  payload: EvalEmailPayload
): Promise<{ sent: number; failed: number; errors: string[] } | null> {
  // Developer Testing Mode Guard: Do NOT dispatch emails to real users during test sessions
  if (isDevTestingModeActive()) {
    console.log(
      `[Developer Testing Mode] Suppressed real email dispatch for deployment "${payload.deploymentTitle}" (${payload.recipients.length} recipients protected)`
    );
    recordDevAction('SUPPRESSED_EXTERNAL_EMAIL', {
      deploymentTitle: payload.deploymentTitle,
      recipientCount: payload.recipients.length,
      sampleRecipients: payload.recipients.slice(0, 3).map(r => r.email)
    });
    return {
      sent: payload.recipients.length,
      failed: 0,
      errors: ['Simulated send: Developer Testing Mode active (real inbox delivery protected).']
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    console.warn('[emailService] Supabase not configured — email notifications skipped.');
    return null;
  }

  const validRecipients = payload.recipients.filter(
    (r) => r.email && r.email.includes('@')
  );

  if (validRecipients.length === 0) {
    console.warn('[emailService] No valid email addresses found — skipping email send.');
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-eval-email', {
      body: { ...payload, recipients: validRecipients },
    });

    if (error) {
      console.error('[emailService] Edge Function error:', error);
      return { sent: 0, failed: validRecipients.length, errors: [String(error.message || error)] };
    }

    const result = data as { sent: number; failed: number; errors: string[] };
    console.log(
      `[emailService] Email dispatch complete — sent: ${result.sent}, failed: ${result.failed}`
    );
    return result;
  } catch (err) {
    console.error('[emailService] Unexpected error invoking email edge function:', err);
    return { sent: 0, failed: validRecipients.length, errors: [String(err)] };
  }
}
