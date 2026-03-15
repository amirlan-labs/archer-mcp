import pc from 'picocolors';

// Emerald green color using ANSI true color (RGB 46, 204, 113)
const EMERALD = '\x1b[38;2;46;204;113m';
const EMERALD_DIM = '\x1b[38;2;39;174;96m';
const RESET = '\x1b[0m';

// Helper to apply emerald color
const emerald = (text: string) => EMERALD + text + RESET;
const emeraldDim = (text: string) => EMERALD_DIM + text + RESET;

// ─── ASCII Art ──────────────────────────────────────────────

export function showAsciiArt(): void {
  const lines = [
    '█████╗ ██████╗  ██████╗██╗  ██╗███████╗██████╗ ',
    '██╔══██╗██╔══██╗██╔════╝██║  ██║██╔════╝██╔══██╗',
    '███████║██████╔╝██║     ███████║█████╗  ██████╔╝',
    '██╔══██║██╔══██╗██║     ██╔══██║██╔══╝  ██╔══██╗',
    '██║  ██║██║  ██║╚██████╗██║  ██║███████╗██║  ██║',
    '╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝',
  ];

  // Column boundaries for coloring:
  // A: cols 0-5, R: 6-13, C: 14-21, H: 22-29, E: 30-37, R: 38-45
  // ARCH = white, ER = emerald green
  const archEnd = 30; // columns 0-29 are A R C H
  const erEnd = 46;   // columns 30-45 are E R

  for (const line of lines) {
    const archPart = line.slice(0, archEnd);
    const erPart = line.slice(archEnd, erEnd);
    const rest = line.slice(erEnd);
    process.stdout.write(pc.white(archPart) + emerald(erPart) + rest + '\n');
  }

  // Pixel art bow and arrow (emerald green)
  const bowArrow = [
    `        ${emerald('│')}`,
    `      ${emerald('╱')}   ${emerald('╲')}`,
    `    ${emerald('(')}     ${emerald(')')}`,
    `      ${emerald('╲')}   ${emerald('╱')}`,
    `        ${emerald('│')}`,
    `      ${emerald('──')} ${emerald('►')}`,
  ];
  
  console.log();
  bowArrow.forEach(line => console.log(line));
  console.log();
  console.log(emeraldDim('  v0.1.0  ·  event intelligence for AI agents'));
  console.log();
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
    '   connected to your Supabase project',
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
