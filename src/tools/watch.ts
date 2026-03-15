import { z } from 'zod';
import { sendCommand } from '../daemon/client.js';
import type { WatchConfig } from '../daemon/types.js';

// ─── Input Schema ───────────────────────────────────────────

export const WatchInputSchema = z.object({
  table: z.string().min(1, 'table name is required'),
  event: z.enum(['INSERT', 'UPDATE', 'DELETE', '*']).default('*'),
  filter: z.string().optional(),
  webhookUrl: z.string().url().optional(),
});

export type WatchInput = z.infer<typeof WatchInputSchema>;

// ─── Execute Watch (via daemon IPC) ─────────────────────────

export async function executeWatch(
  input: WatchInput,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<string> {
  const watchId = `watch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const watch: WatchConfig = {
    id: watchId,
    table: input.table,
    event: input.event,
    filter: input.filter,
    webhookUrl: input.webhookUrl,
    createdAt: new Date().toISOString(),
    supabaseUrl,
    supabaseKey: serviceRoleKey,
  };

  try {
    const res = await sendCommand({ type: 'add_watch', watch });

    if (!res.ok) {
      return `❌ Failed to add watch: ${res.error}`;
    }

    const parts = [
      `✅ Watch created: ${watchId}`,
      `   table: ${input.table}`,
      `   event: ${input.event}`,
    ];

    if (input.filter) parts.push(`   filter: ${input.filter}`);
    if (input.webhookUrl) parts.push(`   webhook: ${input.webhookUrl}`);
    parts.push(`   status: subscribed via daemon (persistent)`);

    return parts.join('\n');
  } catch (err) {
    return `❌ Daemon error: ${err instanceof Error ? err.message : String(err)}\n\nIs the archer daemon running? Try restarting with: npx archer-wizard@latest --daemon`;
  }
}
