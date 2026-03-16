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

</div>

---

## what is Archer

Every AI agent today is reactive. Cursor, Claude Code, opencode — they sit completely idle until you manually talk to them. Nobody built the layer that lets them feel what's happening in real time and act on their own.

Archer is that layer.

You tell your agent what to watch. Archer monitors your data sources 24/7. The moment something changes — your agent fires, already loaded with full context. No prompting. No polling. No manual triggers.

---

## install

```bash
npx archer-wizard@latest
```

Run this inside any project folder. Archer handles everything else automatically.

---

## how it works

```
your data source  ──→  Archer watches 24/7  ──→  event detected  ──→  agent fires
```

1. **scans** your project for data source credentials automatically
2. **detects** which AI agents you have installed on your machine
3. **injects** itself into all their configs — one confirmation, no manual JSON
4. **teaches** every agent when to call `archer_watch` automatically via rules
5. your agent now has a nervous system — it feels the world and acts on its own

---

## quickstart

```bash
# 1. run inside your project
npx archer-wizard@latest

# 2. Archer scans your .env, finds your credentials, injects into your agents

# 3. open your AI agent and say:
"watch my users table for new inserts and fire https://your-webhook-url"

# 4. insert a row in your database

# 5. your webhook fires with full event context
```

---

## MCP tools

Once Archer is set up, your AI agent has access to these tools natively. You never call them directly — your agent calls them when you describe what you want.

### `archer_watch`

Create a persistent real-time watch on a table. Watches survive agent session restarts.

```typescript
archer_watch({
  table: string,        // table or resource to watch (required)
  event?: string,       // INSERT | UPDATE | DELETE | * (default: *)
  filter?: string,      // e.g. "status=eq.active", "amount=gt.1000"
  webhookUrl?: string   // URL to receive POST when event fires
})
```

### `archer_unwatch`

Remove an active watch by its ID.

```typescript
archer_unwatch({
  watchId: string       // the watch ID returned by archer_watch
})
```

### `archer_watches`

List all active watches — their IDs, tables, events, filters, and webhook URLs.

```typescript
archer_watches()
```

---

## talk to your agent

```
"watch my users table and fire https://your-webhook.com when a new row is inserted"
```

```
"monitor the orders table for updates where status equals shipped"
```

```
"alert me at https://your-webhook.com every time a row is deleted from sessions"
```

```
"show me all active watches"
```

```
"stop watching the payments table"
```

---

## supported events

| event | description |
|---|---|
| `INSERT` | new row inserted into a table |
| `UPDATE` | existing row updated |
| `DELETE` | row deleted |
| `*` | all changes (default) |

---

## webhook payload

Every time Archer fires, your webhook receives this:

```json
{
  "archer": {
    "watchId": "uuid",
    "event": "INSERT",
    "table": "users",
    "firedAt": "ISO timestamp"
  },
  "data": {
    "id": "row-id",
    "email": "user@example.com",
    "created_at": "timestamp"
  }
}
```

---

## supported agents

Archer auto-detects and injects into all of these:

| agent | status |
|---|---|
| Cursor | ✓ supported |
| Claude Code | ✓ supported |
| opencode | ✓ supported |
| Windsurf | ✓ supported |
| Antigravity | ✓ supported |

---

## supported data sources

| source | status |
|---|---|
| Supabase | ✓ available now |
| PostgreSQL | coming soon |
| MySQL | coming soon |
| GitHub | coming soon |
| Stripe | coming soon |
| custom webhooks | coming soon |

---

## credentials

Archer scans these files automatically in priority order:

```
.env.local
.env
.env.development
.env.production
```

It recognizes common aliases automatically:

```bash
# standard
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Next.js
NEXT_PUBLIC_SUPABASE_URL=...

# Vite
VITE_SUPABASE_URL=...
```

You never paste credentials manually. Archer finds them.

---

## requirements

- Node.js 18 or higher
- at least one supported AI agent installed
- a `.env` file with your data source credentials
- realtime enabled on tables you want to watch

---

## architecture

```
developer's machine                    data source
───────────────────                    ───────────
npx archer-wizard@latest               realtime channel
   ↓                                          ↓
wizard scans .env          Archer subscribes to changes 24/7
   ↓                                          ↓
injects into agents        event detected → webhook fires
   ↓                                          ↓
agent calls archer_watch   your agent wakes up with full context
```

No AI at runtime. Once a watch is defined it is pure logic — fast, cheap, reliable.

For a deep dive into how Archer is built internally — daemon IPC, state persistence, MCP tools, and the wizard pipeline — see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## what v1 does not include

- no dashboard
- no account required
- no sign in
- no API key
- no cloud service

Everything runs locally on your machine using your own credentials. The architecture is universal from day one — the simplicity is intentional.

---

```bash
# install from npm
npx archer-wizard@latest

# or from source
git clone https://github.com/amirlan-labs/archer-mcp
cd archer-mcp
npm install
npm run dev
```

<div align="center">

*agents stop waiting. the world starts talking.*

</div>