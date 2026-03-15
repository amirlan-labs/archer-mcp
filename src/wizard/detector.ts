import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { AgentInfo } from '../types/index.js';

// ─── Agent Config Paths ─────────────────────────────────────

interface AgentPathConfig {
  name: string;
  paths: {
    darwin: string;
    linux: string;
    win32: string;
  };
}

const AGENTS: AgentPathConfig[] = [
  {
    name: 'cursor',
    paths: {
      darwin: path.join(os.homedir(), '.cursor', 'mcp.json'),
      linux: path.join(os.homedir(), '.cursor', 'mcp.json'),
      win32: path.join(process.env['APPDATA'] ?? os.homedir(), 'Cursor', 'mcp.json'),
    },
  },
  {
    name: 'claude-code',
    paths: {
      darwin: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      linux: path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json'),
      win32: path.join(process.env['APPDATA'] ?? os.homedir(), 'Claude', 'claude_desktop_config.json'),
    },
  },
  {
    name: 'opencode',
    paths: {
      darwin: path.join(os.homedir(), '.config', 'opencode', 'opencode.json'),
      linux: path.join(os.homedir(), '.config', 'opencode', 'opencode.json'),
      win32: path.join(process.env['APPDATA'] ?? os.homedir(), 'opencode', 'opencode.json'),
    },
  },
  {
    name: 'antigravity',
    paths: {
      darwin: path.join(os.homedir(), '.config', 'antigravity', 'config.json'),
      linux: path.join(os.homedir(), '.config', 'antigravity', 'config.json'),
      win32: path.join(process.env['APPDATA'] ?? os.homedir(), 'Antigravity', 'config.json'),
    },
  },
  {
    name: 'windsurf',
    paths: {
      darwin: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
      linux: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
      win32: path.join(process.env['APPDATA'] ?? os.homedir(), 'Windsurf', 'mcp_config.json'),
    },
  },
];

// ─── Platform Detection ─────────────────────────────────────

function getPlatform(): 'darwin' | 'linux' | 'win32' {
  const platform = os.platform();
  if (platform === 'darwin' || platform === 'linux' || platform === 'win32') {
    return platform;
  }
  // Default to linux for other Unix-like systems
  return 'linux';
}

// ─── Get Config Path For Agent ──────────────────────────────

function getConfigPath(agent: AgentPathConfig): string {
  const platform = getPlatform();
  return agent.paths[platform];
}

// ─── Check If Path Exists ───────────────────────────────────

function fileExists(filePath: string): boolean {
  try {
    // Check if the file itself OR its parent directory exists
    // The config file might not exist yet, but the parent app directory should
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function parentDirExists(filePath: string): boolean {
  try {
    const dir = path.dirname(filePath);
    return fs.existsSync(dir);
  } catch {
    return false;
  }
}

// ─── Detect Installed Agents ────────────────────────────────

export function detectAgents(): AgentInfo[] {
  const detected: AgentInfo[] = [];

  for (const agent of AGENTS) {
    const configPath = getConfigPath(agent);
    const configExists = fileExists(configPath);
    const dirExists = parentDirExists(configPath);

    // Agent is "installed" if:
    // 1. The config file exists, OR
    // 2. The parent directory exists (for first-time setup)
    if (configExists || dirExists) {
      detected.push({
        name: agent.name,
        installed: true,
        configPath,
        configExists,
      });
    }
  }

  return detected;
}

// ─── Get Config Key For Agent ───────────────────────────────

export function getConfigKey(agentName: string): 'mcpServers' | 'mcp' {
  if (agentName === 'opencode') {
    return 'mcp';
  }
  // cursor, claude-code, antigravity, windsurf all use mcpServers
  return 'mcpServers';
}

// ─── Get Rules Path For Agent ───────────────────────────────

export function getRulesPath(agentName: string): string {
  const homeDir = os.homedir();
  
  switch (agentName) {
    case 'cursor':
      return path.join(homeDir, '.cursor', 'rules', 'archer.mdc');
    case 'claude-code':
      // For Claude Code, we'll use the project's CLAUDE.md
      // but we need to get the current working directory
      return path.join(process.cwd(), 'CLAUDE.md');
    case 'opencode':
      return path.join(homeDir, '.config', 'opencode', 'rules.md');
    case 'antigravity':
      return path.join(homeDir, '.config', 'antigravity', 'rules.md');
    case 'windsurf':
      return path.join(homeDir, '.codeium', 'windsurf', 'rules.md');
    default:
      return path.join(homeDir, '.archer', 'rules.md');
  }
}
