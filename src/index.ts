#!/usr/bin/env node

import 'dotenv/config';

// ─── Mode Detection ─────────────────────────────────────────

const isMcpMode = process.argv.includes('--mcp');

if (isMcpMode) {
  // ─── MCP Server Mode ─────────────────────────────────────
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
  } = await import('@modelcontextprotocol/sdk/types.js');
  const { executeWatch, WATCH_TOOL_SCHEMA } = await import('./tools/watch.js');
  const { stderrReady, stderrError } = await import('./lib/ascii.js');

  const server = new Server(
    {
      name: 'archer',
      version: '0.1.0',
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
      tools: [WATCH_TOOL_SCHEMA],
    };
  });

  // Register tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'archer_watch') {
      const result = executeWatch(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: `unknown tool: ${name}` }),
        },
      ],
      isError: true,
    };
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
