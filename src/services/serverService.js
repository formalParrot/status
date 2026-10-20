const { generateToken, hashToken } = require("../utils/token");

const db = require("../db/database");
const OFFLINE_THRESHOLD = 90_000; // 90 seconds
const DAY_MS = 86_400_000;
const INSTALL_TOKEN_TTL_MS = 24 * 60 * 60 * 1_000;

function toPublic(server) {
  const offline = Date.now() - server.last_heartbeat > OFFLINE_THRESHOLD;
  return {
    ...server,
    status: offline ? 'offline' : server.status,
  }
}

function recordHeartbeat(serverId, status, metrics) {
  const now = Date.now()

  db.prepare(`
    UPDATE servers
    SET status = ?, last_heartbeat = ?, metrics = ?,
        uptime_reset_at = COALESCE(uptime_reset_at, ?)
    WHERE id = ?
  `).run(status, now, JSON.stringify(metrics ?? {}), now, serverId)

  db.prepare(`
    INSERT INTO heartbeat_log (server_id, timestamp, status)
    VALUES (?, ?, ?)
  `).run(serverId, now, status ?? 'online')
}

function getDailyUptime(serverId, days = 60) {
  const server = db.prepare(`
    SELECT created_at, uptime_reset_at
    FROM servers
    WHERE id = ?
  `).get(serverId);
  if (!server) return [];

  const now = Date.now();
  const today = Math.floor(now / DAY_MS);
  const uptimeStart = Math.max(server.created_at, server.uptime_reset_at ?? server.created_at);
  const earliest = today - (days - 1);

  const heartbeats = db.prepare(`
    SELECT timestamp, status
    FROM heartbeat_log
    WHERE server_id = ? AND timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp ASC
  `).all(serverId, uptimeStart, now);
  heartbeats.unshift({ timestamp: uptimeStart, status: 'online' });

  const result = [];
  for (let day = earliest; day <= today; day++) {
    const dayStart = day * DAY_MS;
    const windowStart = Math.max(dayStart, uptimeStart);
    const windowEnd = Math.min(dayStart + DAY_MS, now);          // clamp partial current day
    let onlineMs = 0;

    for (let index = 0; index < heartbeats.length; index++) {
      const heartbeat = heartbeats[index];
      if (heartbeat.status !== 'online') continue;

      const nextHeartbeat = heartbeats[index + 1]?.timestamp ?? now;
      const segmentStart = Math.max(heartbeat.timestamp, windowStart);
      const segmentEnd = Math.min(
        nextHeartbeat,
        heartbeat.timestamp + OFFLINE_THRESHOLD,
        windowEnd
      );

      if (segmentEnd > segmentStart) {
        onlineMs += segmentEnd - segmentStart;
      }
    }

    result.push({
      day: new Date(dayStart).toISOString().slice(0, 10),        // "2026-10-19" (UTC)
      uptime: windowEnd > windowStart
        ? Math.min(100, (onlineMs * 100) / (windowEnd - windowStart))
        : null,
    });
  }
  return result;
}

function resetUptime(serverId) {
  const now = Date.now();
  const transaction = db.transaction(() => {
    const result = db.prepare(`
      UPDATE servers
      SET uptime_reset_at = ?
      WHERE id = ?
    `).run(now, serverId);

    return result.changes;
  });

  return transaction() ? now : null;
}

function createServer(title) {
  const rawToken = generateToken()
  const tokenHash = hashToken(rawToken)
  const installToken = generateToken()
  const now = Date.now();

  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO servers (name, title, token_hash, created_at, uptime_reset_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, title, tokenHash, now, now);

    db.prepare(`
      INSERT INTO install_tokens (token_hash, server_id, server_token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(hashToken(installToken), result.lastInsertRowid, rawToken, now + INSTALL_TOKEN_TTL_MS);

    return result.lastInsertRowid;
  });

  const id = transaction();
  return { id, title, rawToken, installToken, installTokenExpiresAt: now + INSTALL_TOKEN_TTL_MS }
}

function getInstallToken(token) {
  const now = Date.now();
  const tokenHash = hashToken(token);

  return db.prepare(`
    SELECT server_id, server_token
    FROM install_tokens
    WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
  `).get(tokenHash, now);
}

function completeInstallToken(token) {
  const tokenHash = hashToken(token);
  const result = db.prepare(`
    UPDATE install_tokens
    SET used_at = ?
    WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
  `).run(Date.now(), tokenHash, Date.now());

  return result.changes > 0;
}

function getServers() {
  return db.prepare(`
    SELECT id, title, name, created_at, status, last_heartbeat, metrics
    FROM servers
  `).all().map(toPublic);
}

function findServerById(id) {
  const server = db.prepare(`
    SELECT id, title, name, created_at, status, last_heartbeat, metrics
    FROM servers
    WHERE id = ?
  `).get(id)

  return server ? toPublic(server) : undefined;
}

function findServerByTokenHash(tokenhash) {
  return db.prepare(`
    SELECT id, title, name, created_at, status, last_heartbeat, metrics
    FROM servers
    WHERE token_hash = ?
  `).get(tokenhash);
};

function updateServerTitle(id, title) {
  const result = db.prepare(`
    UPDATE servers
    SET title = ?
    WHERE id = ?
  `).run(title, id);

  return result.changes;
}

function deleteServerById(id) {
  const transaction = db.transaction((serverId) => {
    db.prepare(`
      DELETE FROM heartbeat_log WHERE server_id = ?
    `).run(serverId);

    return db.prepare(`
      DELETE FROM servers WHERE id = ?
    `).run(serverId).changes;
  });

  return transaction(id);
}

module.exports = {
  createServer,
  getServers,
  findServerById,
  findServerByTokenHash,
  updateServerTitle,
  recordHeartbeat,
  getDailyUptime,
  resetUptime,
  deleteServerById,
  getInstallToken,
  completeInstallToken
}
