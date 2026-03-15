import fs from 'node:fs';
import path from 'node:path';
import * as clack from '@clack/prompts';
import { z } from 'zod';
import { logSuccess, logError, maskCredential } from '../lib/ascii.js';
import type { ScanResult, Framework } from '../types/index.js';

// ─── Env File Priority ──────────────────────────────────────

const ENV_FILES = [
  '.env.local',
  '.env',
  '.env.development',
  '.env.production',
] as const;

// ─── Key Aliases ────────────────────────────────────────────

const SUPABASE_URL_ALIASES = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'VITE_SUPABASE_URL',
] as const;

const SERVICE_ROLE_KEY_ALIASES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
] as const;

const ANON_KEY_ALIASES = [
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
] as const;

// ─── Validation Schemas ─────────────────────────────────────

const SupabaseUrlSchema = z.string().url().startsWith('https://', {
  message: 'SUPABASE_URL must start with https://',
});

const ServiceRoleKeySchema = z.string().min(1, {
  message: 'SUPABASE_SERVICE_ROLE_KEY must be a non-empty string',
});

// ─── Parse Env File ─────────────────────────────────────────

function parseEnvFile(filePath: string): Map<string, string> {
  const vars = new Map<string, string>();

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) continue;

      const key = line.slice(0, eqIndex).trim();
      let value = line.slice(eqIndex + 1).trim();

      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && value) {
        vars.set(key, value);
      }
    }
  } catch {
    // File doesn't exist or can't be read — skip silently
  }

  return vars;
}

// ─── Find Key By Aliases ────────────────────────────────────

function findByAliases(
  envMap: Map<string, string>,
  aliases: readonly string[],
): string | null {
  for (const alias of aliases) {
    const value = envMap.get(alias);
    if (value) return value;
  }
  return null;
}

// ─── Detect Framework ───────────────────────────────────────

function detectFramework(cwd: string): { framework: Framework; hasSupabaseInstalled: boolean } {
  let framework: Framework = 'unknown';
  let hasSupabaseInstalled = false;

  try {
    const pkgPath = path.join(cwd, 'package.json');
    const content = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if ('next' in allDeps) {
      framework = 'nextjs';
    } else if ('vite' in allDeps) {
      framework = 'vite';
    }

    if ('@supabase/supabase-js' in allDeps) {
      hasSupabaseInstalled = true;
    }
  } catch {
    // No package.json or parse error — defaults are fine
  }

  return { framework, hasSupabaseInstalled };
}

// ─── Main Scanner ───────────────────────────────────────────

export async function scanProject(cwd: string): Promise<ScanResult> {
  // Merge all env files (earlier files win)
  const mergedEnv = new Map<string, string>();
  let foundInFile: string | null = null;

  // Read in reverse so earlier files overwrite later ones
  for (const file of [...ENV_FILES].reverse()) {
    const filePath = path.join(cwd, file);
    const vars = parseEnvFile(filePath);
    for (const [key, value] of vars) {
      mergedEnv.set(key, value);
    }
    if (vars.size > 0 && !foundInFile) {
      foundInFile = file;
    }
  }

  // Re-check which file had the first match (priority order)
  for (const file of ENV_FILES) {
    const filePath = path.join(cwd, file);
    const vars = parseEnvFile(filePath);
    if (vars.size > 0) {
      foundInFile = file;
      break;
    }
  }

  const supabaseUrl = findByAliases(mergedEnv, SUPABASE_URL_ALIASES);
  const serviceRoleKey = findByAliases(mergedEnv, SERVICE_ROLE_KEY_ALIASES);
  const anonKey = findByAliases(mergedEnv, ANON_KEY_ALIASES);

  const { framework, hasSupabaseInstalled } = detectFramework(cwd);

  // Log found credentials
  if (supabaseUrl) {
    logSuccess(`SUPABASE_URL = ${maskCredential(supabaseUrl)}`);
  } else {
    logError('missing SUPABASE_URL');
  }

  if (serviceRoleKey) {
    logSuccess(`SUPABASE_SERVICE_ROLE_KEY = ${maskCredential(serviceRoleKey)}`);
  } else {
    logError('missing SUPABASE_SERVICE_ROLE_KEY');
  }

  if (anonKey) {
    logSuccess(`SUPABASE_ANON_KEY = ${maskCredential(anonKey)}`);
  }

  if (foundInFile) {
    logSuccess(`found credentials in ${foundInFile}`);
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    anonKey,
    framework,
    hasSupabaseInstalled,
    foundInFile,
  };
}

// ─── Prompt for Missing Credentials ─────────────────────────

export async function promptForMissing(
  scan: ScanResult,
): Promise<{ supabaseUrl: string; serviceRoleKey: string }> {
  let supabaseUrl = scan.supabaseUrl;
  let serviceRoleKey = scan.serviceRoleKey;

  if (!supabaseUrl) {
    const value = await clack.text({
      message: 'Enter your SUPABASE_URL',
      placeholder: 'https://your-project.supabase.co',
      validate: (input) => {
        const result = SupabaseUrlSchema.safeParse(input);
        if (!result.success) {
          return result.error.issues[0]?.message ?? 'Invalid URL';
        }
        return undefined;
      },
    });

    if (clack.isCancel(value)) {
      process.exit(0);
    }

    supabaseUrl = value as string;
  }

  if (!serviceRoleKey) {
    const value = await clack.text({
      message: 'Enter your SUPABASE_SERVICE_ROLE_KEY',
      placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      validate: (input) => {
        const result = ServiceRoleKeySchema.safeParse(input);
        if (!result.success) {
          return result.error.issues[0]?.message ?? 'Invalid key';
        }
        return undefined;
      },
    });

    if (clack.isCancel(value)) {
      process.exit(0);
    }

    serviceRoleKey = value as string;
  }

  return {
    supabaseUrl: SupabaseUrlSchema.parse(supabaseUrl),
    serviceRoleKey: ServiceRoleKeySchema.parse(serviceRoleKey),
  };
}
