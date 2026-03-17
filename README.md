<div align="center">

```
 █████╗ ██████╗  ██████╗██╗  ██╗███████╗██████╗
██╔══██╗██╔══██╗██╔════╝██║  ██║██╔════╝██╔══██╗
███████║██████╔╝██║     ███████║█████╗  ██████╔╝
██╔══██║██╔══██╗██║     ██╔══██║██╔══╝  ██╔══██╗
██║  ██║██║  ██║╚██████╗██║  ██║███████╗██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
```

**event intelligence layer for AI agents**

[![npm version](https://img.shields.io/npm/v/archer-wizard.svg)](https://www.npmjs.com/package/archer-wizard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

Every AI agent today is reactive. It sits idle until you talk to it. Archer gives your agent a nervous system — it watches your database 24/7, and fires the moment something changes.

---

## quickstart

```bash
npx archer-wizard@latest
```

Run this inside any project folder. Archer scans for credentials, detects your agents, and injects itself — one command, no manual config.

---

## installation

### one-liner (recommended)

```bash
npx archer-wizard@latest
```

Archer will:
1. Scan your `.env` files for Supabase credentials
2. Detect which AI agents are installed on your machine
3. Inject itself into all their MCP configs automatically
4. Teach every agent when to call `archer_watch` via rules

### with explicit credentials

```bash
SUPABASE_URL=https://xyz.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-key \
npx archer-wizard@latest
```

---

## MCP tools

Once set up, your agent has these tools available natively. You describe what you want in plain English — the agent calls them.

```bash
# Tell your agent:
"watch the users table and fire https://your-webhook.com on new inserts"
"monitor orders where status equals shipped"
"show all active watches"
"stop watching the payments table"
```

### `archer_watch`

```typescript
archer_watch({
  table: string,       // table to watch (required)
  event?: string,      // INSERT | UPDATE | DELETE | * (default: *)
  filter?: string,     // e.g. "status=eq.active", "amount=gt.1000"
  webhookUrl?: string  // URL to POST when the event fires (optional)
})
```

### `archer_unwatch`

```typescript
archer_unwatch({
  watchId: string      // ID returned by archer_watch
})
```

### `archer_watches`

```typescript
archer_watches()       // list all active watches with status
```

---

## supported agents

| agent | config location |
|---|---|
| Cursor | `~/.cursor/mcp.json` |
| Claude Code | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| OpenCode | `~/.config/opencode/opencode.json` |
| Antigravity | `~/.config/antigravity/config.json` |

---

## supported events

| event | description |
|---|---|
| `INSERT` | new row inserted into a table |
| `UPDATE` | existing row modified |
| `DELETE` | row removed |
| `*` | all of the above (default) |
| `filter` | narrow by any Supabase filter expression |

---

## webhook payload

Every event POSTs this to your webhook URL:

```json
{
  "archer": {
    "watchId": "550e8400-e29b-41d4-a716-446655440000",
    "event": "INSERT",
    "table": "users",
    "firedAt": "2025-03-16T09:15:00.000Z"
  },
  "data": {
    "id": "row-id",
    "email": "user@example.com",
    "created_at": "2025-03-16T09:15:00.000Z"
  }
}
```

Headers included on every request:

| header | value |
|---|---|
| `Content-Type` | `application/json` |
| `User-Agent` | `Archer/0.2.2` |
| `X-Archer-Event` | event type (INSERT / UPDATE / DELETE) |

Archer retries failed deliveries 3 times with a 2s delay.

---

## credential discovery

Archer scans these files automatically, in priority order:

```
.env.local         ← checked first
.env
.env.development
.env.production
```

It recognizes common aliases automatically:

| credential | aliases checked |
|---|---|
| Supabase URL | `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_URL` |
| Service key | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY` |
| Anon key | `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY` |

If no env file is found, Archer scans your codebase for hardcoded values as a fallback.

---

## how it works

```
your agent calls archer_watch
        ↓
Archer daemon starts (detached, persists across sessions)
        ↓
subscribes to Supabase Realtime channel
        ↓
database change detected
        ↓
POST to your webhook URL (3 retries)
```

**The daemon runs at `127.0.0.1:44380` and survives MCP server restarts.** Watches are persisted to `~/.archer/state.json` — they resume automatically after machine restarts.

---

## requirements

- Node.js 18 or higher
- At least one supported AI agent installed
- A Supabase project with [Realtime enabled](https://supabase.com/docs/guides/realtime) on the tables you want to watch

---

## supported data sources

| source | status |
|---|---|
| Supabase | ✓ available |
| PostgreSQL (direct) | coming soon |
| MySQL | coming soon |
| GitHub events | coming soon |
| Stripe webhooks | coming soon |

---

## architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full deep dive — daemon IPC protocol, state persistence, MCP tool implementation, and the setup wizard pipeline.

---

## no account. no cloud. no dashboard.

Archer runs entirely on your machine using your own credentials. No sign-in, no API keys, no data leaves your infrastructure.

---

<div align="center">

*agents stop waiting. the world starts talking.*

</div>