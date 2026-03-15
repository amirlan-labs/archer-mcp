#!/usr/bin/env node

import 'dotenv/config';

// ─── Mode Detection ─────────────────────────────────────────

const isMcpMode = process.argv.includes('--mcp');
const isDaemonMode = process.argv.includes('--daemon');

if (isDaemonMode) {
  // ─── Daemon Mode ──────────────────────────────────────────
  const { startDaemonProcess } = await import('./daemon/process.js');
  startDaemonProcess();
} else if (isMcpMode) {
  // ─── MCP Server Mode ─────────────────────────────────────
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
  } = await import('@modelcontextprotocol/sdk/types.js');
  const { executeWatch, WatchInputSchema } = await import('./tools/watch.js');
  const { executeUnwatch, UnwatchInputSchema } = await import('./tools/unwatch.js');
  const { executeListWatches } = await import('./tools/watches.js');
  const { ensureDaemon } = await import('./daemon/lifecycle.js');
  const { stderrReady, stderrError } = await import('./lib/ascii.js');

  // Auto-start daemon if not running
  try {
    const { pid } = await ensureDaemon();
    stderrReady(`daemon running (pid ${pid})`);
  } catch {
    stderrError('warning: could not start daemon — watches will fail');
  }

  // Read credentials from environment
  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  // ─── Tool Definitions ──────────────────────────────────────

  const WATCH_TOOL = {
    name: 'archer_watch',
    description:
      'Create a persistent real-time watch on a Supabase table. The watch survives agent session restarts. Delivers changes to a webhook URL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        table: { type: 'string', description: 'Supabase table name to watch' },
        event: {
          type: 'string',
          enum: ['INSERT', 'UPDATE', 'DELETE', '*'],
          description: 'Database event to listen for (default: *)',
          default: '*',
        },
        filter: {
          type: 'string',
          description: 'Optional Postgres filter e.g. "status=eq.active"',
        },
        webhookUrl: {
          type: 'string',
          description: 'URL to receive webhook POST when event fires',
        },
      },
      required: ['table'],
    },
  };

  const UNWATCH_TOOL = {
    name: 'archer_unwatch',
    description: 'Remove an active watch by its ID. The watch will stop listening and be deleted from persistent storage.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        watchId: { type: 'string', description: 'The watch ID returned by archer_watch' },
      },
      required: ['watchId'],
    },
  };

  const WATCHES_TOOL = {
    name: 'archer_watches',
    description: 'List all active watches managed by the archer daemon, including their IDs, tables, events, and webhook URLs.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  };

  const server = new Server(
    {
      name: 'archer',
      version: '0.2.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [WATCH_TOOL, UNWATCH_TOOL, WATCHES_TOOL],
    };
  });

  // Register tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let resultText: string;

      switch (name) {
        case 'archer_watch': {
          const input = WatchInputSchema.parse(args);
          resultText = await executeWatch(input, supabaseUrl, serviceRoleKey);
          break;
        }
        case 'archer_unwatch': {
          const input = UnwatchInputSchema.parse(args);
          resultText = await executeUnwatch(input);
          break;
        }
        case 'archer_watches': {
          resultText = await executeListWatches();
          break;
        }
        default:
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ error: `unknown tool: ${name}` }),
              },
            ],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text' as const, text: resultText }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `❌ Error: ${message}` }],
        isError: true,
      };
    }
  });

  // Start server
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    stderrReady('archer MCP server running on stdio');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderrError(`failed to start MCP server: ${message}`);
    process.exit(1);
  }
} else {
  // ─── Wizard Mode ─────────────────────────────────────────
  const { runWizard } = await import('./wizard/index.js');

  try {
    await runWizard();
  } catch (err) {
    if (err instanceof Error && err.message.includes('cancel')) {
      console.log('\n  cancelled.\n');
      process.exit(0);
    }
    console.error(err);
    process.exit(1);
  }
}
