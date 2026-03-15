// ─── Daemon Configuration ───────────────────────────────────

import path from 'node:path';
import os from 'node:os';

export const DAEMON_PORT = 7481;
export const DAEMON_HOST = '127.0.0.1';
export const ARCHER_DIR = path.join(os.homedir(), '.archer');
export const STATE_FILE = path.join(ARCHER_DIR, 'state.json');
export const PID_FILE = path.join(ARCHER_DIR, 'daemon.pid');
export const LOG_FILE = path.join(ARCHER_DIR, 'daemon.log');

// ─── Watch State ────────────────────────────────────────────

export interface WatchConfig {
  id: string;
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  webhookUrl?: string;
  createdAt: string;           // ISO timestamp
  supabaseUrl: string;         // needed to re-subscribe
  supabaseKey: string;         // service role key
}

// ─── IPC Protocol ───────────────────────────────────────────
// JSON lines over TCP. Each message is JSON + '\n'.
// Client sends a Request, daemon responds with a Response.

export type IpcRequest =
  | { type: 'add_watch'; watch: WatchConfig }
  | { type: 'remove_watch'; watchId: string }
  | { type: 'list_watches' }
  | { type: 'ping' };

export type IpcResponse =
  | { ok: true; type: 'watch_added'; watchId: string }
  | { ok: true; type: 'watch_removed'; watchId: string }
  | { ok: true; type: 'watch_list'; watches: WatchConfig[] }
  | { ok: true; type: 'pong' }
  | { ok: false; error: string };
