import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PID_FILE, ARCHER_DIR, LOG_FILE } from './types.js';
import { isDaemonRunning } from './client.js';

// ─── Start Daemon ───────────────────────────────────────────

export async function startDaemon(): Promise<{ pid: number; alreadyRunning: boolean }> {
  // Check if already running
  if (await isDaemonRunning()) {
    const pid = readPid();
    return { pid: pid ?? 0, alreadyRunning: true };
  }

  // Ensure directory exists
  if (!fs.existsSync(ARCHER_DIR)) {
    fs.mkdirSync(ARCHER_DIR, { recursive: true });
  }

  // Resolve the daemon entry script
  // In compiled mode this is dist/daemon/process.js
  // In dev mode with tsx this is src/daemon/process.ts
  const thisFile = fileURLToPath(import.meta.url);
  const thisDir = path.dirname(thisFile);
  
  // Look for the daemon runner script
  const daemonRunner = path.join(thisDir, 'run.js');
  const daemonRunnerTs = path.join(thisDir, 'run.ts');
  
  let cmd: string;
  let args: string[];

  if (fs.existsSync(daemonRunner)) {
    // Compiled mode
    cmd = process.execPath; // node
    args = [daemonRunner];
  } else if (fs.existsSync(daemonRunnerTs)) {
    // Dev mode — use tsx
    cmd = 'npx';
    args = ['tsx', daemonRunnerTs];
  } else {
    // Fallback: assume we're in dist/ and run process.js directly
    const processJs = path.join(thisDir, 'process.js');
    cmd = process.execPath;
    args = [processJs, '--run-daemon'];
  }

  // Open log file for daemon output
  const logFd = fs.openSync(LOG_FILE, 'a');

  const child = spawn(cmd, args, {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env },
  });

  child.unref();
  fs.closeSync(logFd);

  const pid = child.pid ?? 0;

  // Wait briefly for daemon to start, then verify
  await sleep(500);
  
  const running = await isDaemonRunning();
  if (!running) {
    // Give it another moment
    await sleep(1000);
  }

  return { pid, alreadyRunning: false };
}

// ─── Stop Daemon ────────────────────────────────────────────

export async function stopDaemon(): Promise<boolean> {
  const pid = readPid();
  if (pid === null) return false;

  try {
    process.kill(pid, 'SIGTERM');
    // Wait for it to die
    await sleep(500);
    return true;
  } catch {
    // Process already dead — clean up PID file
    try { fs.unlinkSync(PID_FILE); } catch {}
    return false;
  }
}

// ─── Ensure Daemon is Running ───────────────────────────────

export async function ensureDaemon(): Promise<{ pid: number }> {
  const result = await startDaemon();
  return { pid: result.pid };
}

// ─── Helpers ────────────────────────────────────────────────

function readPid(): number | null {
  try {
    if (!fs.existsSync(PID_FILE)) return null;
    const raw = fs.readFileSync(PID_FILE, 'utf-8').trim();
    const pid = parseInt(raw, 10);
    if (isNaN(pid)) return null;

    // Check if process is alive
    try {
      process.kill(pid, 0); // Signal 0 = existence check
      return pid;
    } catch {
      // Process is dead — clean up stale PID
      try { fs.unlinkSync(PID_FILE); } catch {}
      return null;
    }
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
