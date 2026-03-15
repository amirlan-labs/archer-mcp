import { z } from 'zod';
import { sendCommand } from '../daemon/client.js';

// ─── Input Schema ───────────────────────────────────────────

export const UnwatchInputSchema = z.object({
  watchId: z.string().min(1, 'watchId is required'),
});

export type UnwatchInput = z.infer<typeof UnwatchInputSchema>;

// ─── Execute Unwatch (via daemon IPC) ───────────────────────

export async function executeUnwatch(input: UnwatchInput): Promise<string> {
  try {
    const res = await sendCommand({ type: 'remove_watch', watchId: input.watchId });

    if (!res.ok) {
      return `❌ Failed to remove watch: ${res.error}`;
    }

    return `✅ Watch removed: ${input.watchId}`;
  } catch (err) {
    return `❌ Daemon error: ${err instanceof Error ? err.message : String(err)}\n\nIs the archer daemon running?`;
  }
}
