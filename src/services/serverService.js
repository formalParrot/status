const { generateToken, hashToken } = require("../utils/token");

const db = require("../db/database");

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
  `).all();
}

function findServerById(id) {
  return db.prepare(`
    SELECT id, name, created_at, status, last_heartbeat, metrics
    FROM servers
    WHERE id = ?
  `).get(id);
}

function findServerByTokenHash(tokenhash) {
  return db.prepare(`
    SELECT id, name, created_at, status, last_heartbeat, metrics
    FROM servers
    WHERE token_hash = ?
  `).get(tokenhash);
};

function deleteServerById() { }

function recordHeartbeat(serverId, status, metrics) {
  db.prepare(`
    UPDATE servers
    SET status = ?, last_heartbeat = ?, metrics = ?
    WHERE id = ?
  `).run(status, Date.now(), JSON.stringify(metrics ?? {}), serverId);
}

module.exports = {
  createServer,
  getServers,
  findServerById,
  findServerByTokenHash,
  recordHeartbeat
}
