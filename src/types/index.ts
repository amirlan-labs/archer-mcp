import { z } from 'zod';

// ─── Framework Detection ────────────────────────────────────

export type Framework = 'nextjs' | 'vite' | 'unknown';

// ─── Scanner Types ──────────────────────────────────────────

export interface ScanResult {
  supabaseUrl: string | null;
  serviceRoleKey: string | null;
  anonKey: string | null;
  framework: Framework;
  hasSupabaseInstalled: boolean;
  foundInFile: string | null;
}

export interface ValidatedCredentials {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey: string | null;
}

// ─── Agent Detection ────────────────────────────────────────

export interface AgentInfo {
  name: string;
  installed: boolean;
  configPath: string;
  configExists: boolean;
}

export type AgentName = 'cursor' | 'claude-code' | 'opencode' | 'antigravity' | 'windsurf';

export interface AgentConfigFormat {
  name: AgentName;
  displayName: string;
  configKey: 'mcpServers' | 'mcp';
  rulesPath: (cwd: string) => string;
}

// ─── Watch Tool Types ───────────────────────────────────────

export const WatchEventSchema = z.enum([
  'auth.signup',
  'table.insert',
  'table.update',
  'table.delete',
]);

export type WatchEvent = z.infer<typeof WatchEventSchema>;

export const WatchInputSchema = z.object({
  source: z.literal('supabase'),
  event: WatchEventSchema,
  table: z.string().optional(),
  condition: z.string().optional(),
  webhookUrl: z.string().url('webhookUrl must be a valid URL'),
}).refine(
  (data) => {
    if (data.event !== 'auth.signup' && !data.table) {
      return false;
    }
    return true;
  },
  {
    message: 'table is required when event is not auth.signup',
    path: ['table'],
  }
);

export type WatchInput = z.infer<typeof WatchInputSchema>;

export interface WatchResult {
  success: boolean;
  watchId: string;
  message: string;
  condition: string | null;
}

// ─── Webhook Types ──────────────────────────────────────────

export interface WebhookPayload {
  archer: {
    watchId: string;
    event: string;
    source: 'supabase';
    firedAt: string;
  };
  data: Record<string, unknown>;
}

export interface WebhookOptions {
  url: string;
  payload: WebhookPayload;
  event: string;
}

// ─── Supabase Realtime Types ────────────────────────────────

export type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeChannelConfig {
  table: string;
  event: PostgresEvent;
}

// ─── Injection Types ────────────────────────────────────────

export interface InjectionResult {
  agent: string;
  success: boolean;
  error?: string;
}

export type McpServerEntry = Record<string, unknown>;
