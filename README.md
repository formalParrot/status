# Parrot Status

## API routes

Unless noted otherwise, routes are relative to the public API URL, for example
`https://status.justparrot.me`.

| Method | Route | Description |
|---|---|---|
| `GET` | `/install.sh/health` | Check the installer endpoint and return its version. |
| `GET` | `/install.sh/:token` | Generate a one-time shell installer for a server. |
| `POST` | `/install.sh/:token/complete` | Mark an installer token as used after installation. |
| `GET` | `/servers` | List all monitored servers and their current status. |
| `POST` | `/servers` | Create a monitored server and return its server token and install command. |
| `GET` | `/servers/:id` | Get one monitored server by ID. |
| `GET` | `/servers/:id/uptime` | Get daily wall-clock uptime percentages for the server. |
| `POST` | `/servers/:id/reset-uptime` | Reset the server's uptime window from the current time. |
| `DELETE` | `/servers/:id` | Delete a monitored server and its heartbeat history. |
| `POST` | `/heartbeat` | Record a heartbeat from a monitored server. Requires the server's bearer token. |

### Reset uptime

Reset server `17` and start a new uptime window:

```sh
curl -fsS -X POST \
  https://status.justparrot.me/servers/17/reset-uptime
```

Then retrieve the uptime:

```sh
curl -fsS \
  https://status.justparrot.me/servers/17/uptime
```
