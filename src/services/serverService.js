const { generateToken, hashToken } = require("../utils/token");

const db = require("../db/database");
const OFFLINE_THRESHOLD = 90_000; // 90 seconds
const HEARTBEAT_INTERVAL_MS = 30_000;
const DAY_MS = 86_400_400;

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
    SET status = ?, last_heartbeat = ?, metrics = ?
    WHERE id = ?
  `).run(status, now, JSON.stringify(metrics ?? {}), serverId)

  db.prepare(`
    INSERT INTO heartbeat_log (server_id, timestamp, status)
    VALUES (?, ?, ?)
  `).run(serverId, now, status ?? 'online')
}

function getDailyUptime(serverId, days = 60) {
  const server = db.prepare(`SELECT created_at FROM servers WHERE id = ?`).get(serverId);
  if (!server) return [];

  const now = Date.now();
  const today = Math.floor(now / DAY_MS);
  const earliest = Math.max(Math.floor(server.created_at / DAY_MS), today - (days - 1));

  const rows = db.prepare(`
    SELECT timestamp / 86400000 AS day, SUM(status = 'online') AS online
    FROM heartbeat_log
    WHERE server_id = ? AND timestamp >= ?
    GROUP BY day
  `).all(serverId, earliest * DAY_MS);

  const counts = new Map(rows.map(r => [r.day, r.online]));

  const result = [];
  for (let day = earliest; day <= today; day++) {
    const dayStart = day * DAY_MS;
    const windowStart = Math.max(dayStart, server.created_at);   // clamp to registration
    const windowEnd = Math.min(dayStart + DAY_MS, now);          // clamp partial current day
    const expected = Math.floor((windowEnd - windowStart) / HEARTBEAT_INTERVAL_MS);
    const online = counts.get(day) ?? 0;

    result.push({
      day: new Date(dayStart).toISOString().slice(0, 10),        // "2026-10-19" (UTC)
      uptime: expected > 0 ? Math.min(100, (online * 100) / expected) : null,
    });
  }
  return result;
}

function createServer(name) {
  const rawToken = generateToken()
  const tokenHash = hashToken(rawToken)

  db.prepare(`
    INSERT INTO servers (name, token_hash, created_at)
    VALUES (?, ?, ?)
  `).run(name, tokenHash, Date.now());

  return { name, rawToken }
}

function getServers() {
  return db.prepare(`
    SELECT id, name, created_at, status, last_heartbeat, metrics
    FROM servers
  `).all().map(toPublic);
}

function findServerById(id) {
  const server = db.prepare(`
    SELECT id, name, created_at, status, last_heartbeat, metrics
    FROM servers
    WHERE id = ?
  `).get(id)

  return server ? toPublic(server) : undefined;
}

function findServerByTokenHash(tokenhash) {
  return db.prepare(`
    SELECT id, name, created_at, status, last_heartbeat, metrics
    FROM servers
    WHERE token_hash = ?
  `).get(tokenhash);
};

function deleteServerById() { }

module.exports = {
  createServer,
  getServers,
  findServerById,
  findServerByTokenHash,
  recordHeartbeat,
  getDailyUptime
}
