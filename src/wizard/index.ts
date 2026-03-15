import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { showAsciiArt, logAction, logSuccess, showSuccessBox } from '../lib/ascii.js';
import { scanProject, promptForMissing } from './scanner.js';
import { detectAgents } from './detector.js';
import { injectIntoAgents } from './injector.js';
import { injectRules } from './rules.js';

// ─── Wizard Sequence ────────────────────────────────────────

export async function runWizard(): Promise<void> {
  const cwd = process.cwd();

  // ─ Step 1: ASCII Art ─
  showAsciiArt();

  // ─ Step 2: Start clack ─
  clack.intro(pc.bgGreen(pc.black(' archer setup ')));

  // ─ Step 3: Scanning ─
  logAction('scanning project for Supabase credentials...');
  console.log();

  // ─ Step 4-6: Scan env files ─
  const scan = await scanProject(cwd);
  console.log();

  // ─ Step 7: Framework detection ─
  if (scan.framework !== 'unknown') {
    logSuccess(`detected ${pc.bold(scan.framework)} project`);
  }
  if (scan.hasSupabaseInstalled) {
    logSuccess('found @supabase/supabase-js');
  }

  // ─ Step 8: Prompt for missing credentials ─
  const credentials = await promptForMissing(scan);
  console.log();

  // ─ Step 9: Detect agents ─
  logAction('detecting AI agents...');
  const agents = detectAgents();
  console.log();

  // ─ Step 10-11: Inject into agents ─
  const injectionResults = await injectIntoAgents(
    agents,
    credentials.supabaseUrl,
    credentials.serviceRoleKey,
  );
  console.log();

  // ─ Step 12: Filter successful injections ─
  const successfulAgents = agents.filter((a) =>
    injectionResults.some((r) => r.agent === a.name && r.success),
  );

  // ─ Step 13: Inject rules ─
  if (successfulAgents.length > 0) {
    logAction('writing agent rules...');
    injectRules(successfulAgents);
    console.log();
  }

  // ─ Step 14: Success ─
  showSuccessBox(successfulAgents.length);

  clack.outro(pc.dim('docs → github.com/archer-mcp'));
}
