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

Zapier was built for apps talking to apps.  
**Archer was built for the world talking to AI agents.**

Every AI agent today is reactive. Cursor, Claude Code, opencode — they sit completely idle until you manually talk to them. Nobody built the layer that lets them feel what's happening in real time and act on their own.

Archer is that layer.

You define a condition once in plain english. Archer watches your data sources 24/7. The moment that condition is true — your AI agent wakes up, already loaded with full context, and acts immediately. No prompting. No polling. No manual triggers.

---

## install

```bash
npx archer@latest
```

Run this inside any project folder. Archer handles everything else automatically.

---

## how it works

```
your data source  ──→  Archer watches 24/7  ──→  condition met  ──→  agent fires
```

1. **scans** your project for data source credentials automatically
2. **detects** which AI agents you have installed on your machine
3. **injects** itself into all their configs — one confirmation, no manual JSON
4. **teaches** every agent when to call `archer.watch()` automatically via global rules
5. your agent now has a nervous system — it feels the world and acts on its own

---

## quickstart

```bash
# 1. run inside your project
npx archer-wizard@latest

# 2. Archer scans your .env, finds your credentials, injects into your agents

# 3. open your AI agent and say:
"watch my users table for new signups and fire https://your-webhook-url"

# 4. insert a row in your database

# 5. your agent fires automatically
```

---

## the tool — `archer.watch()`

Once Archer is set up, your AI agent has access to this tool natively. You never call it directly — your agent calls it when you describe what you want.

```typescript
archer.watch({
  source: string,       // data source
  event: string,        // what to listen for
  table?: string,       // table name for table events
  condition?: string,   // plain english condition (optional)
  webhookUrl: string    // where to fire when condition is met
})
```

**just talk to your agent:**

```
"watch my users table and fire https://your-webhook.com
 when a new user signs up with a .edu email"
```

```
"watch my orders table for new inserts and notify https://your-webhook.com"
```

```
"fire https://your-webhook.com every time a row is deleted from sessions"
```

---

## supported events (currently only supabase, p.s. we will add more soon)

| event | description |
|---|---|
| `auth.signup` | new user registers |
| `table.insert` | new row inserted into any table |
| `table.update` | existing row updated |
| `table.delete` | row deleted |

---

## webhook payload

Every time Archer fires, your agent receives this:

```json
{
  "archer": {
    "watchId": "uuid",
    "event": "table.insert",
    "source": "supabase",
    "firedAt": "ISO timestamp"
  },
  "data": {
    "id": "row-id",
    "email": "user@university.edu",
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
| Google Antigravity | ✓ supported |
| Windsurf | ✓ supported |

---

## supported data sources

Archer is built universal — any data source, any platform.

| source | status |
|---|---|
| Supabase | ✓ available now |
| GitHub | coming soon |
| Stripe | coming soon |
| Linear | coming soon |
| Vercel | coming soon |
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

It recognizes all common aliases automatically:

```bash
# standard
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Next.js — also recognized automatically
NEXT_PUBLIC_SUPABASE_URL=...

# Vite — also recognized automatically
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
injects into agents        condition matched → webhook fires
   ↓                                          ↓
agent calls archer.watch() AI agent wakes up with full context
```

No AI at runtime. Once a condition is defined it is pure logic — fast, cheap, reliable.

---

## what v1 does not include

- no dashboard
- no account required
- no sign in
- no API key
- no cloud service

Everything runs locally on your machine using your own credentials. The architecture is universal from day one — the simplicity is intentional.



```bash
# Install from npm
npx archer-wizard@latest

# Or from source:
git clone https://github.com/amirlan-labs/archer-mcp
cd archer-mcp
npm install
npm run dev
```


<div align="center">

*agents stop waiting. the world starts talking.*

</div>