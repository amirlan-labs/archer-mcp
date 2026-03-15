import pc from 'picocolors';

// Force colors for better visibility
const colors = pc.createColors(true);

// Use picocolors green (more compatible than true color)
const emerald = colors.green;
const emeraldDim = colors.dim;

// ─── ASCII Art ──────────────────────────────────────────────

export function showAsciiArt(): void {
  const lines = [
    '',
    '   █████╗ ██████╗  ██████╗██╗  ██╗███████╗██████╗ ',
    '  ██╔══██╗██╔══██╗██╔════╝██║  ██║██╔════╝██╔══██╗',
    '  ███████║██████╔╝██║     ███████║█████╗  ██████╔╝',
    '  ██╔══██║██╔══██╗██║     ██╔══██║██╔══╝  ██╔══██╗',
    '  ██║  ██║██║  ██║╚██████╗██║  ██║███████╗██║  ██║',
    '  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝',
    '',
  ];

  for (const line of lines) {
    console.log(emerald(line));
  }
}

// ─── Status Logger ──────────────────────────────────────────

export function logAction(message: string): void {
  console.log(`${pc.blue('◆')}  ${message}`);
}

export function logSuccess(message: string): void {
  console.log(`${pc.green('✓')}  ${message}`);
}

export function logError(message: string): void {
  console.log(`${pc.red('✗')}  ${message}`);
}

export function logProgress(message: string): void {
  console.log(`${pc.white('●')}  ${message}`);
}

export function logReady(message: string): void {
  console.log(`${pc.green('▶')}  ${message}`);
}

// ─── Credential Masking ─────────────────────────────────────

export function maskCredential(value: string): string {
  if (value.length <= 8) {
    return value.slice(0, 3) + '******';
  }
  return value.slice(0, 8) + '******';
}

// ─── Success Box ────────────────────────────────────────────

export function showSuccessBox(agentCount: number): void {
  const lines = [
    '',
    `   ${pc.green('▶')}  Archer is ready`,
    '',
    `   injected into ${agentCount} agent${agentCount !== 1 ? 's' : ''}`,
    '   connected to your backend',
    '',
    '   open your AI agent and say:',
    `   ${pc.dim('"watch my users table for new signups"')}`,
    '',
  ];

  const maxLen = 46;
  console.log(`  ┌${'─'.repeat(maxLen)}┐`);
  for (const line of lines) {
    const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
    const padding = maxLen - stripped.length;
    console.log(`  │${line}${' '.repeat(Math.max(0, padding))}│`);
  }
  console.log(`  └${'─'.repeat(maxLen)}┘`);
}

// ─── Stderr Logger (for MCP mode) ───────────────────────────

export function stderrLog(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function stderrAction(message: string): void {
  process.stderr.write(`${pc.blue('◆')}  ${message}\n`);
}

export function stderrSuccess(message: string): void {
  process.stderr.write(`${pc.green('✓')}  ${message}\n`);
}

export function stderrError(message: string): void {
  process.stderr.write(`${pc.red('✗')}  ${message}\n`);
}

export function stderrReady(message: string): void {
  process.stderr.write(`${pc.green('▶')}  ${message}\n`);
}
