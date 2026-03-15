import crypto from 'node:crypto';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { WatchInputSchema, type WatchInput, type WatchResult, type PostgresEvent } from '../types/index.js';
import { createAuthChannel, createTableChannel } from '../lib/supabase.js';
import { fireWebhook, buildWebhookPayload } from '../lib/webhook.js';
import { stderrAction, stderrSuccess, stderrError } from '../lib/ascii.js';

// ─── Active Subscriptions ───────────────────────────────────

interface ActiveWatch {
  watchId: string;
  channel: RealtimeChannel;
  event: string;
  table?: string;
  condition?: string;
  webhookUrl: string;
}

const activeWatches = new Map<string, ActiveWatch>();

// ─── Condition Evaluator ────────────────────────────────────

function evaluateCondition(
  data: Record<string, unknown>,
  condition: string,
): boolean {
  // Parse: "field operator value"
  // Supported: "ends with", "starts with", "contains", "equals"
  const operators = ['ends with', 'starts with', 'contains', 'equals'] as const;

  const conditionLower = condition.toLowerCase();
  let matchedOperator: (typeof operators)[number] | null = null;
  let splitIndex = -1;

  for (const op of operators) {
    const idx = conditionLower.indexOf(op);
    if (idx !== -1) {
      matchedOperator = op;
      splitIndex = idx;
      break;
    }
  }

  if (!matchedOperator || splitIndex === -1) {
    stderrError(`unknown condition format: "${condition}"`);
    return true; // Pass through if condition can't be parsed
  }

  const field = condition.slice(0, splitIndex).trim();
  const value = condition.slice(splitIndex + matchedOperator.length).trim();
  const fieldValue = String(data[field] ?? '');

  switch (matchedOperator) {
    case 'ends with':
      return fieldValue.endsWith(value);
    case 'starts with':
      return fieldValue.startsWith(value);
    case 'contains':
      return fieldValue.includes(value);
    case 'equals':
      return fieldValue === value;
    default:
      return true;
  }
}

// ─── Map Event To Postgres Event ────────────────────────────

function toPostgresEvent(event: string): PostgresEvent {
  switch (event) {
    case 'table.insert': return 'INSERT';
    case 'table.update': return 'UPDATE';
    case 'table.delete': return 'DELETE';
    default: return 'INSERT';
  }
}

// ─── Event Handler ──────────────────────────────────────────

function createEventHandler(watch: ActiveWatch) {
  return async (data: Record<string, unknown>) => {
    stderrAction(`event received → ${watch.event}${watch.table ? ` on ${watch.table}` : ''}`);

    // Apply condition filter
    if (watch.condition && !evaluateCondition(data, watch.condition)) {
      stderrAction(`condition not met → "${watch.condition}", skipping`);
      return;
    }

    // Build and fire webhook
    const payload = buildWebhookPayload(watch.watchId, watch.event, data);
    await fireWebhook({
      url: watch.webhookUrl,
      payload,
      event: watch.event,
    });
  };
}

// ─── Main Watch Implementation ──────────────────────────────

export function executeWatch(rawInput: unknown): WatchResult {
  // Validate input
  const parseResult = WatchInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map((e) => e.message).join(', ');
    return {
      success: false,
      watchId: '',
      message: `validation failed: ${errors}`,
      condition: null,
    };
  }

  const input: WatchInput = parseResult.data;
  const watchId = `watch_${crypto.randomUUID().slice(0, 8)}`;

  stderrAction(`creating watch ${watchId} for ${input.event}`);

  try {
    let channel: RealtimeChannel;

    if (input.event === 'auth.signup') {
      // Auth signup → watch auth.users table
      const handler = createEventHandler({
        watchId,
        channel: null as unknown as RealtimeChannel,
        event: input.event,
        condition: input.condition,
        webhookUrl: input.webhookUrl,
      });

      channel = createAuthChannel(watchId, handler);
    } else {
      // Table events → watch specific table
      const table = input.table!;
      const pgEvent = toPostgresEvent(input.event);

      const handler = createEventHandler({
        watchId,
        channel: null as unknown as RealtimeChannel,
        event: input.event,
        table,
        condition: input.condition,
        webhookUrl: input.webhookUrl,
      });

      channel = createTableChannel(watchId, table, pgEvent, handler);
    }

    // Store active watch
    const watch: ActiveWatch = {
      watchId,
      channel,
      event: input.event,
      table: input.table,
      condition: input.condition,
      webhookUrl: input.webhookUrl,
    };

    activeWatches.set(watchId, watch);

    const tableInfo = input.table ? ` on table "${input.table}"` : '';
    const conditionInfo = input.condition ? ` where ${input.condition}` : '';
    const message = `watching ${input.event}${tableInfo}${conditionInfo} → ${input.webhookUrl}`;

    stderrSuccess(message);

    return {
      success: true,
      watchId,
      message,
      condition: input.condition ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderrError(`watch failed: ${message}`);

    return {
      success: false,
      watchId,
      message: `watch failed: ${message}`,
      condition: input.condition ?? null,
    };
  }
}

// ─── Tool Schema (for MCP registration) ─────────────────────

export const WATCH_TOOL_SCHEMA = {
  name: 'archer_watch',
  description:
    'Archer is the event intelligence layer for AI agents. Watch real-time events from data sources. Monitors auth signups, table inserts, updates, and deletes. Fires a webhook when conditions are met. Agents stop waiting for you to talk to them and start acting on their own when the world moves.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      source: {
        type: 'string' as const,
        enum: ['supabase'],
        description: 'Event source (currently only "supabase")',
      },
      event: {
        type: 'string' as const,
        enum: ['auth.signup', 'table.insert', 'table.update', 'table.delete'],
        description: 'Event type to watch for',
      },
      table: {
        type: 'string' as const,
        description: 'Table name (required for table.* events)',
      },
      condition: {
        type: 'string' as const,
        description:
          'Optional filter like "email ends with @gmail.com". Supports: ends with, starts with, contains, equals',
      },
      webhookUrl: {
        type: 'string' as const,
        description: 'URL to receive POST notifications when events match',
      },
    },
    required: ['source', 'event', 'webhookUrl'],
  },
};
