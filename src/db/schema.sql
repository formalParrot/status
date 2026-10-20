CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    title TEXT,
    token_hash TEXT NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'unknown',
    last_heartbeat INTEGER,

    metrics TEXT,

    created_at INTEGER NOT NULL,
    uptime_reset_at INTEGER
);

CREATE TABLE IF NOT EXISTS heartbeat_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_heartbeat_log_server_time
    ON heartbeat_log (server_id, timestamp);

CREATE TABLE IF NOT EXISTS install_tokens (
    token_hash TEXT PRIMARY KEY,
    server_id INTEGER NOT NULL,
    server_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_install_tokens_expiry
    ON install_tokens (expires_at);

CREATE TABLE IF NOT EXISTS maintenance_windows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    starts_at INTEGER NOT NULL,
    ends_at INTEGER,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS discord_webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
);