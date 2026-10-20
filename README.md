# Parrot Status

## API routes

Unless noted otherwise, routes are relative to the public API URL, for example
`https://status.justparrot.me`.

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Live static dashboard showing fleet and per-server uptime. |
| `GET` | `/install.sh/health` | Check the installer endpoint and return its version. |
| `GET` | `/install.sh/:token` | Generate a one-time shell installer for a server. |
| `POST` | `/install.sh/:token/complete` | Mark an installer token as used after installation. |
| `GET` | `/servers` | List all monitored servers and their current status. |
| `POST` | `/servers` | Create a monitored server with a `title`, then return its server token and install command. |
| `GET` | `/servers/:id` | Get one monitored server by ID. |
| `PATCH` | `/servers/:id` | Update a server's title. Requires `x-admin-key`. |
| `GET` | `/servers/:id/uptime` | Get daily wall-clock uptime percentages for the server. |
| `POST` | `/servers/:id/reset-uptime` | Reset the server's uptime window from the current time. Requires `x-admin-key`. |
| `DELETE` | `/servers/:id` | Delete a monitored server and its heartbeat history. Requires `x-admin-key`. |
| `POST` | `/heartbeat` | Record a heartbeat from a monitored server. Requires the server's bearer token. |

Mutating server routes (`POST /servers`, `PATCH /servers/:id`, `POST /servers/:id/reset-uptime`, and
`DELETE /servers/:id`) require the `x-admin-key` header. Configure the key in
the server-side `.env` file:

```dotenv
ADMIN_KEY=replace-with-a-long-random-secret
```

Copy `.env.example` to `.env`, replace the example with a long random secret,
and restart the API. The `.env` file is ignored by Git. Environment variables
provided by the process still take precedence over values from `.env`. Do not
put this key in the public dashboard or in client-side code.

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