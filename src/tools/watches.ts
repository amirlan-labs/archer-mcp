import { sendCommand } from '../daemon/client.js';

// ─── Execute List Watches (via daemon IPC) ──────────────────

export async function executeListWatches(): Promise<string> {
  try {
    const res = await sendCommand({ type: 'list_watches' });

    if (!res.ok) {
      return `❌ Failed to list watches: ${res.error}`;
    }

    if (res.type !== 'watch_list') {
      return `❌ Unexpected response type: ${res.type}`;
    }

    if (res.watches.length === 0) {
      return '📭 No active watches.';
    }

    const lines = [`📋 Active watches (${res.watches.length}):\n`];

    for (const w of res.watches) {
      lines.push(`  🔹 ${w.id}`);
      lines.push(`     table: ${w.table}`);
      lines.push(`     event: ${w.event}`);
      if (w.filter) lines.push(`     filter: ${w.filter}`);
      if (w.webhookUrl) lines.push(`     webhook: ${w.webhookUrl}`);
      lines.push(`     created: ${w.createdAt}`);
      lines.push('');
    }

    return lines.join('\n');
  } catch (err) {
    return `❌ Daemon error: ${err instanceof Error ? err.message : String(err)}\n\nIs the archer daemon running?`;
  }
}
