import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { showAsciiArt, showSuccessBox } from '../lib/ascii.js';
import { scanProject, promptForMissing } from './scanner.js';
import { detectAgents } from './detector.js';
import { injectIntoAgents } from './injector.js';
import { injectRules } from './rules.js';

// ─── Helpers ─────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Wizard Sequence ────────────────────────────────────────

export async function runWizard(): Promise<void> {
  const cwd = process.cwd();

  // ─ Step 1: ASCII Art ─
  showAsciiArt();

  // ─ Step 2: Start clack ─
  clack.intro(pc.bgGreen(pc.black(' archer setup ')));

  // ─ Step 3: Scan for Supabase credentials ─
  const s = clack.spinner();
  s.start('scanning project for supabase credentials');
  await sleep(600);
  const scan = await scanProject(cwd);
  await sleep(300);

  // Build scan summary lines
  const scanNotes: string[] = [];
  if (scan.supabaseUrl) scanNotes.push('SUPABASE_URL');
  if (scan.serviceRoleKey) scanNotes.push('SERVICE_ROLE_KEY');
  if (scan.anonKey) scanNotes.push('ANON_KEY');
  if (scan.foundInFile) scanNotes.push(`from ${scan.foundInFile}`);

  if (scanNotes.length > 0) {
    s.stop(`found ${pc.green(scanNotes.join(pc.dim(' · ')))}`);
  } else {
    s.stop(pc.yellow('no credentials found — will prompt'));
  }

  // ─ Step 4: Framework detection ─
  if (scan.framework !== 'unknown' || scan.hasSupabaseInstalled) {
    const s2 = clack.spinner();
    s2.start('detecting project framework');
    await sleep(400);
    const parts: string[] = [];
    if (scan.framework !== 'unknown') parts.push(pc.bold(scan.framework));
    if (scan.hasSupabaseInstalled) parts.push(pc.dim('@supabase/supabase-js'));
    s2.stop(`detected ${parts.join(pc.dim(' + '))}`);
  }

  // ─ Step 5: Prompt for missing credentials ─
  const credentials = await promptForMissing(scan);

  // ─ Step 6: Detect agents ─
  const s3 = clack.spinner();
  s3.start('scanning for AI agents');
  await sleep(500);
  const agents = detectAgents();
  await sleep(200);

  if (agents.length > 0) {
    const names = agents.map((a) => pc.bold(a.name)).join(pc.dim(', '));
    s3.stop(`found ${pc.green(String(agents.length))} agent${agents.length !== 1 ? 's' : ''} — ${names}`);
  } else {
    s3.stop(pc.yellow('no agents found'));
  }

  // ─ Step 7: Inject into agents ─
  const injectionResults = await injectIntoAgents(
    agents,
    credentials.supabaseUrl,
    credentials.serviceRoleKey,
  );

  // ─ Step 8: Filter successful injections ─
  const successfulAgents = agents.filter((a) =>
    injectionResults.some((r) => r.agent === a.name && r.success),
  );

  // ─ Step 9: Inject rules ─
  if (successfulAgents.length > 0) {
    const s4 = clack.spinner();
    s4.start('writing agent rules');
    await sleep(400);
    injectRules(successfulAgents);
    await sleep(200);
    s4.stop(`rules injected into ${pc.green(String(successfulAgents.length))} agent${successfulAgents.length !== 1 ? 's' : ''}`);
  }

  // ─ Step 10: Success ─
  console.log();
  showSuccessBox(successfulAgents.length);

  clack.outro(pc.dim('docs → github.com/archer-mcp'));
}
