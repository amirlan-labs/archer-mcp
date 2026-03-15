import fs from 'node:fs';
import path from 'node:path';
import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { logSuccess, logError, logAction } from '../lib/ascii.js';
import { getConfigKey } from './detector.js';
import type { AgentInfo, InjectionResult, McpServerEntry } from '../types/index.js';

// ─── Archer MCP Entry (agent-aware) ─────────────────────────

function buildArcherEntry(
  agentName: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): McpServerEntry {
  const envVars = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };

  // opencode uses { type, command[], environment }
  if (agentName === 'opencode') {
    return {
      type: 'local',
      command: ['npx', '-y', 'archer-wizard@latest', '--mcp'],
      environment: envVars,
    };
  }

  // cursor, claude-code, windsurf, antigravity use { command, args, env }
  return {
    command: 'npx',
    args: ['-y', 'archer-wizard@latest', '--mcp'],
    env: envVars,
  };
}

// ─── Read or Create Config ──────────────────────────────────

function readConfig(configPath: string): Record<string, unknown> {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as Record<string, unknown>;
    }
  } catch {
    // Parse error or read error — start fresh
  }
  return {};
}

function writeConfig(configPath: string, config: Record<string, unknown>): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

// ─── Inject Into Single Agent ───────────────────────────────

function injectIntoAgent(
  agent: AgentInfo,
  supabaseUrl: string,
  serviceRoleKey: string,
): InjectionResult {
  try {
    const configKey = getConfigKey(agent.name);
    const config = readConfig(agent.configPath);
    const archerEntry = buildArcherEntry(agent.name, supabaseUrl, serviceRoleKey);

    // Ensure the config key object exists
    if (!config[configKey] || typeof config[configKey] !== 'object') {
      config[configKey] = {};
    }

    // Inject archer entry without overwriting other servers
    const servers = config[configKey] as Record<string, unknown>;
    servers['archer'] = archerEntry;

    writeConfig(agent.configPath, config);

    logSuccess(`injected into ${pc.bold(agent.name)} → ${agent.configPath}`);
    return { agent: agent.name, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(`failed to inject into ${agent.name}: ${message}`);
    return { agent: agent.name, success: false, error: message };
  }
}

// ─── Main Injector ──────────────────────────────────────────

export async function injectIntoAgents(
  agents: AgentInfo[],
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<InjectionResult[]> {
  if (agents.length === 0) {
    logError('no AI agents detected on this system');
    return [];
  }

  // Display found agents
  console.log();
  logAction('detected agents:');
  for (const agent of agents) {
    console.log(`   ${pc.dim('·')} ${pc.bold(agent.name)}`);
  }
  console.log();

  // Single confirmation
  const shouldInject = await clack.confirm({
    message: `inject archer into ${agents.length} agent${agents.length !== 1 ? 's' : ''}?`,
    initialValue: true,
  });

  if (clack.isCancel(shouldInject) || !shouldInject) {
    logAction('skipped injection');
    return [];
  }

  // Inject into all confirmed agents
  const results: InjectionResult[] = [];
  for (const agent of agents) {
    const result = injectIntoAgent(agent, supabaseUrl, serviceRoleKey);
    results.push(result);
  }

  return results;
}
