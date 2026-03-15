import fs from 'node:fs';
import path from 'node:path';
import { logSuccess, logError } from '../lib/ascii.js';
import { getRulesPath } from './detector.js';
import type { AgentInfo } from '../types/index.js';

// ─── Rule Content ───────────────────────────────────────────

const RULE_CONTENT = `
# Archer — Event Intelligence for AI Agents

Archer is connected to this project's Supabase instance.

## Available Tool: archer.watch

You can watch real-time events from Supabase using the \`archer.watch\` MCP tool.

### Parameters

- **source**: always \`"supabase"\`
- **event**: one of \`"auth.signup"\`, \`"table.insert"\`, \`"table.update"\`, \`"table.delete"\`
- **table**: the table name (required for table events)
- **condition**: optional filter like \`"email ends with @gmail.com"\`
- **webhookUrl**: URL to receive POST notifications

### Examples

1. Watch for new user signups:
   \`\`\`
   archer.watch({ source: "supabase", event: "auth.signup", webhookUrl: "https://hooks.example.com/signups" })
   \`\`\`

2. Watch for inserts to the orders table:
   \`\`\`
   archer.watch({ source: "supabase", event: "table.insert", table: "orders", webhookUrl: "https://hooks.example.com/orders" })
   \`\`\`

3. Watch with a condition:
   \`\`\`
   archer.watch({ source: "supabase", event: "table.insert", table: "users", condition: "email ends with @company.com", webhookUrl: "https://hooks.example.com/vip" })
   \`\`\`

When the user asks to "watch" or "monitor" something in their database, use this tool.
`.trim();

// ─── Archer Block Markers ───────────────────────────────────

const BLOCK_START = '<!-- archer:start -->';
const BLOCK_END = '<!-- archer:end -->';

function wrapInBlock(content: string): string {
  return `${BLOCK_START}\n${content}\n${BLOCK_END}`;
}

// ─── Replace or Append Block ────────────────────────────────

function insertContent(existingContent: string, newBlock: string): string {
  const startIdx = existingContent.indexOf(BLOCK_START);
  const endIdx = existingContent.indexOf(BLOCK_END);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing block
    return (
      existingContent.slice(0, startIdx) +
      newBlock +
      existingContent.slice(endIdx + BLOCK_END.length)
    );
  }

  // Append to end
  const separator = existingContent.endsWith('\n') ? '\n' : '\n\n';
  return existingContent + separator + newBlock + '\n';
}

// ─── Write Rules to Agent ───────────────────────────────────

function writeRulesForAgent(agent: AgentInfo, cwd: string): boolean {
  try {
    const rulesPath = getRulesPath(agent.name, cwd);
    const dir = path.dirname(rulesPath);
    const wrappedContent = wrapInBlock(RULE_CONTENT);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Read existing content or start fresh
    let existingContent = '';
    if (fs.existsSync(rulesPath)) {
      existingContent = fs.readFileSync(rulesPath, 'utf-8');
    }

    const finalContent = insertContent(existingContent, wrappedContent);
    fs.writeFileSync(rulesPath, finalContent, 'utf-8');

    logSuccess(`wrote rules to ${agent.name} → ${rulesPath}`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(`failed to write rules for ${agent.name}: ${message}`);
    return false;
  }
}

// ─── Main Rules Injector ────────────────────────────────────

export function injectRules(agents: AgentInfo[], cwd: string): void {
  for (const agent of agents) {
    writeRulesForAgent(agent, cwd);
  }
}
