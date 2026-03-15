// Daemon runner — this file is the entry point for the detached daemon process.
// It gets spawned by lifecycle.ts and runs startDaemonProcess().

import { startDaemonProcess } from './process.js';

startDaemonProcess();
