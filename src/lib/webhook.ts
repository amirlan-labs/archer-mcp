import { stderrAction, stderrSuccess, stderrError } from './ascii.js';
import type { WebhookOptions, WebhookPayload } from '../types/index.js';

// ─── Retry Config ───────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Fire Webhook ───────────────────────────────────────────

export async function fireWebhook(options: WebhookOptions): Promise<boolean> {
  const { url, payload, event } = options;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      stderrAction(`webhook → ${url} (attempt ${attempt}/${MAX_RETRIES})`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Archer/0.1.0',
          'X-Archer-Event': event,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        stderrSuccess(`webhook delivered → ${response.status}`);
        return true;
      }

      stderrError(`webhook failed → ${response.status} ${response.statusText}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      stderrError(`webhook error → ${message}`);
    }

    if (attempt < MAX_RETRIES) {
      stderrAction(`retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  stderrError(`webhook exhausted all ${MAX_RETRIES} retries`);
  return false;
}

// ─── Build Payload ──────────────────────────────────────────

export function buildWebhookPayload(
  watchId: string,
  event: string,
  data: Record<string, unknown>,
): WebhookPayload {
  return {
    archer: {
      watchId,
      event,
      source: 'supabase',
      firedAt: new Date().toISOString(),
    },
    data,
  };
}
