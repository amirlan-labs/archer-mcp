import fs from 'node:fs';
import path from 'node:path';
import { ARCHER_DIR, STATE_FILE } from './types.js';
import type { WatchConfig } from './types.js';

// ─── Ensure Directory ───────────────────────────────────────

function ensureDir(): void {
  if (!fs.existsSync(ARCHER_DIR)) {
    fs.mkdirSync(ARCHER_DIR, { recursive: true });
  }
}

// ─── Load Watches ───────────────────────────────────────────

export function loadWatches(): WatchConfig[] {
  try {
    if (!fs.existsSync(STATE_FILE)) return [];
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as WatchConfig[];
  } catch {
    return [];
  }
}

// ─── Save Watches (atomic write) ────────────────────────────

export function saveWatches(watches: WatchConfig[]): void {
  ensureDir();
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(watches, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmp, STATE_FILE);
}

// ─── Add Watch ──────────────────────────────────────────────

export function addWatch(watch: WatchConfig): WatchConfig[] {
  const watches = loadWatches();
  // Replace if same ID exists
  const idx = watches.findIndex((w) => w.id === watch.id);
  if (idx >= 0) {
    watches[idx] = watch;
  } else {
    watches.push(watch);
  }
  saveWatches(watches);
  return watches;
}

// ─── Remove Watch ───────────────────────────────────────────

export function removeWatch(watchId: string): { watches: WatchConfig[]; removed: boolean } {
  const watches = loadWatches();
  const before = watches.length;
  const filtered = watches.filter((w) => w.id !== watchId);
  saveWatches(filtered);
  return { watches: filtered, removed: filtered.length < before };
}
