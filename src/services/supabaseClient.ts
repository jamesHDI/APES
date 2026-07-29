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

let client: any = null;
if (isSupabaseConfigured) {
  try {
    client = createClient(rawUrl, rawKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export const supabase = client;
