import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};

const rawUrl = (metaEnv.VITE_SUPABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
const rawKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^['"]|['"]$/g, '');

export const isSupabaseConfigured = Boolean(
  rawUrl && 
  rawKey && 
  rawUrl.startsWith('http') &&
  rawUrl !== 'https://your-supabase-project.supabase.co'
);

console.log(`[Supabase Init] URL configured: ${Boolean(rawUrl && rawUrl !== 'https://your-supabase-project.supabase.co')}, Key configured: ${Boolean(rawKey && rawKey !== 'your-supabase-anon-key-here')}, Cloud Sync Active: ${isSupabaseConfigured}`);

let client: any = null;
if (isSupabaseConfigured) {
  try {
    client = createClient(rawUrl, rawKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export const supabase = client;

let broadcastChannelInstance: any = null;

/**
 * Triggers a 0-latency Realtime WebSocket broadcast event across all connected clients/devices.
 */
export const triggerRealtimeBroadcast = (event: string = 'data_changed', payload: any = {}) => {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    if (!broadcastChannelInstance) {
      broadcastChannelInstance = supabase.channel('apes_broadcast_events');
      broadcastChannelInstance.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          broadcastChannelInstance.send({
            type: 'broadcast',
            event,
            payload: { timestamp: Date.now(), ...payload }
          });
        }
      });
    } else {
      broadcastChannelInstance.send({
        type: 'broadcast',
        event,
        payload: { timestamp: Date.now(), ...payload }
      });
    }
  } catch (err) {
    console.warn('Realtime broadcast error:', err);
  }
};
