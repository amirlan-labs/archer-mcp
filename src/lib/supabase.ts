import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { stderrError } from './ascii.js';
import type { PostgresEvent } from '../types/index.js';

// ─── Env Validation ─────────────────────────────────────────

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    stderrError(`missing required env var: ${name}`);
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

// ─── Supabase Client ────────────────────────────────────────

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = getEnvVar('SUPABASE_URL');
  const key = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

// ─── Realtime Channel Helpers ───────────────────────────────

export function createAuthChannel(
  channelName: string,
  onEvent: (payload: Record<string, unknown>) => void,
): RealtimeChannel {
  const client = getSupabaseClient();

  const channel = client
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'auth', table: 'users' }, (payload) => {
      onEvent(payload.new as Record<string, unknown>);
    })
    .subscribe();

  return channel;
}

export function createTableChannel(
  channelName: string,
  table: string,
  event: PostgresEvent,
  onEvent: (payload: Record<string, unknown>) => void,
): RealtimeChannel {
  const client = getSupabaseClient();

  const channel = client
    .channel(channelName)
    .on('postgres_changes', { event, schema: 'public', table }, (payload) => {
      const data = event === 'DELETE' ? payload.old : payload.new;
      onEvent(data as Record<string, unknown>);
    })
    .subscribe();

  return channel;
}

// ─── Cleanup ────────────────────────────────────────────────

export async function removeChannel(channel: RealtimeChannel): Promise<void> {
  const client = getSupabaseClient();
  await client.removeChannel(channel);
}
