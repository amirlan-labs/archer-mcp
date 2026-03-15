import fs from 'node:fs';
import path from 'node:path';
import { logSuccess, logError } from '../lib/ascii.js';
import { getRulesPath } from './detector.js';
import type { AgentInfo } from '../types/index.js';

// ─── Rule Content ───────────────────────────────────────────

const RULE_CONTENT = `
# Archer — Event Intelligence for AI Agents

Archer is the universal event intelligence layer for AI agents. It watches your data sources in real time, detects changes the moment they happen, and delivers full context to your webhook — so your agent can react instantly, without polling.

## Available MCP Tools

### archer_watch
Create a persistent real-time watch on a data source. Watches survive agent session restarts.

**Parameters:**
- **table** *(required)* — name of the table or resource to watch
- **event** — type of change: \`INSERT\`, \`UPDATE\`, \`DELETE\`, or \`*\` (all). Default: \`*\`
- **filter** — optional filter expression, e.g. \`"status=eq.active"\` or \`"amount=gt.1000"\`
- **webhookUrl** — URL to receive a POST with full event payload when a match fires

### archer_unwatch
Remove an active watch by its ID. Stops listening and cleans up.

**Parameters:**
- **watchId** *(required)* — the watch ID returned by \`archer_watch\`

### archer_watches
List all active watches — their IDs, tables, events, filters, and webhook URLs.

## When to Use Archer

Use Archer any time the user wants to:
- **Monitor data changes** — new rows, updates, deletions in any table
- **React to events** — trigger automations when conditions are met
- **Set up alerts** — notify on signups, new orders, status changes, threshold breaches
- **Build event-driven workflows** — chain watches with webhooks for real-time pipelines
- **Track activity** — audit logs, user actions, system events

## Examples

1. Watch for new rows in a table:
   \`\`\`
   archer_watch({ table: "users", event: "INSERT", webhookUrl: "https://hooks.example.com/new-users" })
   \`\`\`

2. Watch for updates with a filter:
   \`\`\`
   archer_watch({ table: "orders", event: "UPDATE", filter: "status=eq.shipped", webhookUrl: "https://hooks.example.com/shipped" })
   \`\`\`

3. Watch all changes on a table:
   \`\`\`
   archer_watch({ table: "payments", webhookUrl: "https://hooks.example.com/payments" })
   \`\`\`

4. List active watches:
   \`\`\`
   archer_watches()
   \`\`\`

5. Stop a watch:
   \`\`\`
   archer_unwatch({ watchId: "abc-123" })
   \`\`\`

## Best Practices

- Add filters to reduce noise — only fire on events that matter
- Use descriptive webhook URLs that map to specific actions
- Chain multiple watches for complex event-driven workflows
- Use \`archer_watches\` to inspect and manage active watchers
- Clean up watches you no longer need with \`archer_unwatch\`

## Trigger Words

When the user says **"watch"**, **"monitor"**, **"notify me"**, **"alert me"**, **"track"**, **"listen for"**, or **"fire when"** — use Archer.
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

function writeRulesForAgent(agent: AgentInfo): boolean {
  try {
    const rulesPath = getRulesPath(agent.name);
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

export function injectRules(agents: AgentInfo[]): void {
  for (const agent of agents) {
    writeRulesForAgent(agent);
  }
}
