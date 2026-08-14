# Status Monitoring System — Architecture Plan

## 1. Overall Architecture

```
                         Internet
                            │
                     api.example.com
                            │
                       Cloudflare
                            │
              ┌─────────────┴─────────────┐
              │                           │
        /status/*                    everything else
              │                           │
              ▼                           ▼
       Raspberry Pi                  Remote server
       cloudflared                   cloudflared
              │                           │
              ▼                           ▼
       Express :3000                Express :3000
              │
              ▼
           SQLite
```

- The Raspberry Pi handles only the status-monitoring API.
- The remote server handles all other APIs.
- Both share one domain — no need for `/api` or `/v1` prefixes:
  - `api.example.com/status/...` → Pi
  - `api.example.com/whatever/...` → Remote server

## 2. Cloudflare Routing

| Rule | Destination |
|---|---|
| `/status/*` | Raspberry Pi |
| `/*` | Remote server |

The `/status/*` rule must be evaluated first.

The Pi only needs an **outbound** Cloudflare Tunnel connection — port 3000 is never exposed to the internet directly.

> **Verify before relying on this:** Cloudflare's path-based routing has been reported to behave more like regex matching than simple prefix matching — two paths sharing a prefix (e.g. `/a_b_c` and `/a_b_c_2`) can collide and route to the wrong tunnel until renamed to be unambiguous. Test both routes explicitly after setup rather than assuming it works.

## 3. Raspberry Pi Project Structure

```
status-api/
├── data/
│   └── status.db
├── src/
│   ├── api/
│   │   └── status/
│   │       ├── heartbeat.js
│   │       └── servers.js
│   │
│   ├── db/
│   │   ├── database.js
│   │   └── schema.sql
│   │
│   ├── middleware/
│   │   ├── authenticateServer.js
│   │   └── authenticateApiKey.js
│   │
│   ├── services/
│   │   ├── heartbeatService.js
│   │   └── serverService.js
│   │
│   ├── utils/
│   │   └── token.js
│   │
│   └── server.js
│
├── .gitignore
└── package.json
```

`.gitignore`:
```
/data/
.env
node_modules/
```

## 4. Database

```sql
CREATE TABLE servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    token_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'unknown',
    last_heartbeat INTEGER,
    metrics TEXT,
    created_at INTEGER NOT NULL
);
```

- `metrics` is JSON stored as SQLite `TEXT`. Don't create a column per possible metric — different services (Minecraft, Docker, a Node app) report different things.
- Timestamps (`created_at`, `last_heartbeat`) are stored as **milliseconds since epoch** (`Date.now()`), and used consistently everywhere. This avoids unit-mismatch bugs when comparing against `Date.now()` in offline checks.

## 5. Server Authentication

Each monitored machine gets a unique random token.

```
generateToken()
       │
       ├── raw token → given to the server (one-time reveal)
       │
       └── hashToken()
                 ↓
             stored in SQLite
```

- The API only ever stores the **hash**. The raw token exists only at creation time — return it from `createServer()` so it can be copied into that server's config, since it can never be recovered afterward.
- The monitored server stores its raw token locally, e.g.:

```
SERVER_ID=us-01
SERVER_TOKEN=...
HEARTBEAT_URL=https://api.example.com/status/heartbeat
```

```js
function createServer(name) {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  db.prepare(`
    INSERT INTO servers (name, token_hash, created_at)
    VALUES (?, ?, ?)
  `).run(name, tokenHash, Date.now());

  return { name, rawToken }; // rawToken returned once, then unrecoverable
}
```

## 6. Routes

| Route | Caller | Auth | Purpose |
|---|---|---|---|
| `POST /status/heartbeat` | Each monitored server's heartbeat agent (~every 30s) | Server's own bearer token | The only **write** endpoint. Reports the server is alive plus arbitrary metrics (CPU, memory, players, etc). |
| `GET /status/servers` | Dashboard | Dashboard API key | Lists all registered servers with current status, last heartbeat, and latest metrics. |
| `GET /status/servers/:id` | Dashboard | Dashboard API key | Same as above, scoped to one server. |
| `GET /health` | Anything checking whether the status API process itself is up | None | Meta health check on the API, separate from the infrastructure it monitors. |

Two separate credentials — never reuse them:
- **Server token** → `POST /status/heartbeat`
- **Dashboard API key** → `GET /status/servers[/:id]`

Example heartbeat body:
```json
{
    "status": "online",
    "metrics": {
        "cpu": 32.4,
        "memory": 61.2,
        "disk": 47.8
    }
}
```

A different service (e.g. Minecraft) can send entirely different metrics — the API doesn't validate the shape:
```json
{
    "status": "online",
    "metrics": {
        "cpu": 32.4,
        "memory": 61.2,
        "players": 7,
        "max_players": 20
    }
}
```

## 7. Heartbeat Agent

Runs on every monitored server, under PM2:

```
heartbeat-agent
       │
       ├── read token
       ├── collect metrics
       ├── POST /status/heartbeat
       ├── wait ~30 seconds
       └── repeat
```

Should stay generic enough to add new metric sources later (Minecraft players, Docker containers, Linux CPU/RAM/disk) without touching authentication.

## 8. Offline Detection

Offline status is derived from `last_heartbeat` staleness, not from servers explicitly announcing death — dying processes rarely send a goodbye message.

```js
const isOffline = Date.now() - server.last_heartbeat > 90_000; // e.g. 90s threshold
```

## 9. Dashboard

Optionally hosted on the Pi itself:

```
status.example.com
       ↓
Raspberry Pi
       ↓
status API
```

Calls `GET api.example.com/status/servers` and renders something like:

```
US-01        ONLINE       CPU 32%    7 players
US-02        ONLINE       CPU 18%
EU-01        OFFLINE      4m ago
```

## 10. Build Order

1. Express project
2. SQLite + `schema.sql`
3. `token.js`
4. `serverService.js`
5. Server registration
6. `authenticateServer` middleware
7. `POST /status/heartbeat`
8. Generic heartbeat agent
9. `GET /status/servers`
10. `GET /status/servers/:id`
11. Dashboard API key
12. Cloudflare Tunnel routing
13. Raspberry Pi dashboard
14. PM2 + startup configuration

**First milestone:** send a heartbeat from one remote server through Cloudflare to the Pi and see it land in SQLite. That proves the core architecture; everything after is interfaces and polish.

## 11. Gaps to Address Beyond the Original Plan

- **Rate limiting** on `POST /status/heartbeat` — protects against a leaked token or a buggy agent looping without its 30s wait.
- **Payload size cap** on `metrics` — nothing currently stops an agent from sending an oversized JSON blob.
- **Process supervision for the Pi's own Express server and `cloudflared`** — the plan only puts the *remote heartbeat agents* under PM2. The Pi's own API process and tunnel client should also auto-restart on crash/reboot.
- **SQLite backup** — `status.db` lives on a single SD card with no backup story.
- **Single point of failure** — the status-monitoring system's own uptime depends on one unmonitored Raspberry Pi.
