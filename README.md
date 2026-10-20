# Parrot Status

## API routes

Unless noted otherwise, routes are relative to the public API URL, for example
`https://status.justparrot.me`.

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Live static dashboard showing fleet and per-server uptime. |
| `GET` | `/manage` | Admin page for server, maintenance, incident, and webhook management. |
| `POST` | `/admin/login` | Sign in to the admin page with the `ADMIN_KEY` PIN. |
| `POST` | `/admin/logout` | End the current admin session. |
| `GET` | `/install.sh/health` | Check the installer endpoint and return its version. |
| `GET` | `/install.sh/:token` | Generate a one-time shell installer for a server. |
| `POST` | `/install.sh/:token/complete` | Mark an installer token as used after installation. |
| `GET` | `/servers` | List all monitored servers and their current status. |
| `POST` | `/servers` | Create a monitored server with a `title`, then return its server token and install command. |
| `GET` | `/servers/:id` | Get one monitored server by ID. |
| `PATCH` | `/servers/:id` | Update a server's title. Requires `x-admin-key`. |
| `GET` | `/servers/:id/uptime` | Get daily wall-clock uptime percentages for the server. |
| `GET` | `/incidents` | List open public incidents. |
| `GET` | `/maintenance` | List active maintenance windows. |
| `POST` | `/servers/:id/reset-uptime` | Reset the server's uptime window from the current time. Requires `x-admin-key`. |
| `DELETE` | `/servers/:id` | Delete a monitored server and its heartbeat history. Requires `x-admin-key`. |
| `POST` | `/heartbeat` | Record a heartbeat from a monitored server. Requires the server's bearer token. |

Mutating server routes (`POST /servers`, `PATCH /servers/:id`, `POST /servers/:id/reset-uptime`, and
`DELETE /servers/:id`) require an admin session or the `x-admin-key` header. Configure the key in
the server-side `.env` file:

```dotenv
ADMIN_KEY=replace-with-a-long-random-secret
```

Copy `.env.example` to `.env`, replace the example with a long random secret,
and restart the API. The `.env` file is ignored by Git. Environment variables
provided by the process still take precedence over values from `.env`. Do not
put this key in the public dashboard or in client-side code.

Open `/manage` to sign in with the PIN. The session expires after eight hours.
The admin page can create, rename, and delete servers; reset uptime; publish
and resolve incidents; schedule maintenance; and add Discord webhooks. A
webhook can apply to one server or all servers. Webhooks receive server
online/offline, maintenance, and incident events.

Discord webhook events are sent to every enabled webhook configured for the
affected server, plus every enabled webhook configured for all servers.

Create a server with the title shown on the dashboard:

```sh
curl -fsS -X POST \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_KEY" \
  -d '{"title":"Production API"}' \
  https://status.justparrot.me/servers
```

  Update an existing server title:

  ```sh
  curl -fsS -X PATCH \
    -H "Content-Type: application/json" \
    -H "x-admin-key: $ADMIN_KEY" \
    -d '{"title":"Production API"}' \
    https://status.justparrot.me/servers/17
  ```

### Reset uptime

Reset server `17` and start a new uptime window:

```sh
curl -fsS -X POST \
  -H "x-admin-key: $ADMIN_KEY" \
  https://status.justparrot.me/servers/17/reset-uptime
```

Then retrieve the uptime:

```sh
curl -fsS \
  https://status.justparrot.me/servers/17/uptime
```