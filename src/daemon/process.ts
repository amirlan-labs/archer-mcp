import net from 'node:net';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { DAEMON_PORT, DAEMON_HOST, PID_FILE, ARCHER_DIR, LOG_FILE } from './types.js';
import type { IpcRequest, IpcResponse, WatchConfig } from './types.js';
import { loadWatches, addWatch, removeWatch } from './store.js';
import fs from 'node:fs';

// ─── Simple webhook delivery for daemon context ─────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deliverWebhook(url: string, payload: unknown, watchId: string, table: string, eventType: string): Promise<void> {
  const webhookPayload = {
    archer: {
      watchId,
      event: eventType,
      table,
      firedAt: new Date().toISOString(),
    },
    data: payload,
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Archer/0.2.0',
          'X-Archer-Event': eventType,
        },
        body: JSON.stringify(webhookPayload),
      });
      if (res.ok) {
        return;
      }
      log(`[webhook] attempt ${attempt} failed: ${res.status} ${res.statusText}`);
    } catch (err) {
      log(`[webhook] attempt ${attempt} error: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (attempt < MAX_RETRIES) {
      log(`[webhook] retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error(`webhook failed after ${MAX_RETRIES} attempts`);
}

// ─── Active Channel Registry ────────────────────────────────

const channels = new Map<string, { client: SupabaseClient; channel: RealtimeChannel }>();

// ─── Subscribe to a Watch ───────────────────────────────────

function subscribe(watch: WatchConfig): void {
  // Skip if already subscribed
  if (channels.has(watch.id)) return;

  const client = createClient(watch.supabaseUrl, watch.supabaseKey);

  const channelName = `daemon-${watch.table}-${watch.id}`;
  const channel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: watch.event,
        schema: 'public',
        table: watch.table,
        ...(watch.filter ? { filter: watch.filter } : {}),
      },
      async (payload) => {
        log(`[event] ${watch.table} ${payload.eventType} → watch ${watch.id}`);

        if (watch.webhookUrl) {
          try {
            await deliverWebhook(
              watch.webhookUrl,
              payload.new ?? payload.old ?? payload,
              watch.id,
              watch.table,
              payload.eventType
            );
            log(`[webhook] delivered to ${watch.webhookUrl}`);
          } catch (err) {
            log(`[webhook] failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      },
    )
    .subscribe((status) => {
      log(`[channel] ${channelName} → ${status}`);
    });

  channels.set(watch.id, { client, channel });
}

// ─── Unsubscribe from a Watch ───────────────────────────────

async function unsubscribe(watchId: string): Promise<void> {
  const entry = channels.get(watchId);
  if (!entry) return;

  await entry.client.removeChannel(entry.channel);
  channels.delete(watchId);
}

// ─── Handle IPC Command ─────────────────────────────────────

async function handleCommand(req: IpcRequest): Promise<IpcResponse> {
  switch (req.type) {
    case 'add_watch': {
      const watches = addWatch(req.watch);
      subscribe(req.watch);
      return { ok: true, type: 'watch_added', watchId: req.watch.id };
    }

    case 'remove_watch': {
      const { watches, removed } = removeWatch(req.watchId);
      if (!removed) {
        return { ok: false, error: `watch ${req.watchId} not found` };
      }
      await unsubscribe(req.watchId);
      return { ok: true, type: 'watch_removed', watchId: req.watchId };
    }

    case 'list_watches': {
      const watches = loadWatches();
      return { ok: true, type: 'watch_list', watches };
    }

    case 'ping': {
      return { ok: true, type: 'pong' };
    }

    default:
      return { ok: false, error: 'unknown command' };
  }
}

// ─── Logging ────────────────────────────────────────────────

function log(message: string): void {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${message}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // If we can't write to log, just continue
  }
}

// ─── Main: Start TCP Server ─────────────────────────────────

export function startDaemonProcess(): void {
  // Ensure directory exists
  if (!fs.existsSync(ARCHER_DIR)) {
    fs.mkdirSync(ARCHER_DIR, { recursive: true });
  }

  // Write PID file
  fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');

  log('daemon starting');

  // Re-subscribe all persisted watches
  const watches = loadWatches();
  for (const watch of watches) {
    subscribe(watch);
    log(`[restore] re-subscribed watch ${watch.id} on ${watch.table}`);
  }
  log(`restored ${watches.length} watch(es)`);

  // Create TCP server
  const server = net.createServer((socket) => {
    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();

      // Process complete JSON lines
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (!line) continue;

        try {
          const req = JSON.parse(line) as IpcRequest;
          const res = await handleCommand(req);
          socket.write(JSON.stringify(res) + '\n');
        } catch (err) {
          const errRes: IpcResponse = {
            ok: false,
            error: `parse error: ${err instanceof Error ? err.message : String(err)}`,
          };
          socket.write(JSON.stringify(errRes) + '\n');
        }
      }
    });

    socket.on('error', (err) => {
      log(`[socket] error: ${err.message}`);
    });
  });

  server.listen(DAEMON_PORT, DAEMON_HOST, () => {
    log(`daemon listening on ${DAEMON_HOST}:${DAEMON_PORT} (pid ${process.pid})`);
  });

  server.on('error', (err) => {
    log(`[server] error: ${err.message}`);
    process.exit(1);
  });

  // Clean shutdown
  const shutdown = () => {
    log('daemon shutting down');
    server.close();

    // Unsubscribe all channels
    for (const [id, entry] of channels) {
      entry.client.removeChannel(entry.channel).catch(() => {});
    }
    channels.clear();

    // Remove PID file
    try {
      fs.unlinkSync(PID_FILE);
    } catch {}

    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
