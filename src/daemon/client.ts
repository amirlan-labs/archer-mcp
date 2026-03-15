import net from 'node:net';
import { DAEMON_PORT, DAEMON_HOST } from './types.js';
import type { IpcRequest, IpcResponse } from './types.js';

// ─── Send Command to Daemon ─────────────────────────────────

export function sendCommand(req: IpcRequest): Promise<IpcResponse> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: DAEMON_HOST, port: DAEMON_PORT }, () => {
      socket.write(JSON.stringify(req) + '\n');
    });

    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        socket.end();
        try {
          resolve(JSON.parse(line) as IpcResponse);
        } catch (err) {
          reject(new Error(`invalid daemon response: ${line}`));
        }
      }
    });

    socket.on('error', (err) => {
      reject(new Error(`daemon connection failed: ${err.message}`));
    });

    // Timeout after 5 seconds
    socket.setTimeout(5_000, () => {
      socket.destroy();
      reject(new Error('daemon response timeout'));
    });
  });
}

// ─── Check if Daemon is Running ─────────────────────────────

export async function isDaemonRunning(): Promise<boolean> {
  try {
    const res = await sendCommand({ type: 'ping' });
    return res.ok && res.type === 'pong';
  } catch {
    return false;
  }
}
