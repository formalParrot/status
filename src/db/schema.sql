CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    token_hash TEXT NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'unknown',
    last_heartbeat INTEGER,

    metrics TEXT,

    created_at INTEGER NOT NULL
);
