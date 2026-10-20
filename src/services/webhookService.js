const db = require("../db/database");

async function notifyServer(serverId, event, details) {
  const hooks = db.prepare(`
    SELECT url FROM discord_webhooks
    WHERE enabled = 1 AND (server_id IS NULL OR server_id = ?)
  `).all(serverId);

  await Promise.all(hooks.map(async ({ url }) => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: `Parrot Status: ${event}`,
            description: details,
            color: event.includes("offline") ? 0x8d3431 : 0x648a3d,
            timestamp: new Date().toISOString()
          }]
        })
      });
      if (!response.ok) console.error(`Discord webhook rejected event (${response.status})`);
    } catch (error) {
      console.error("Discord webhook delivery failed:", error.message);
    }
  }));
}

function listWebhooks() {
  return db.prepare(`
    SELECT id, server_id, name, enabled, created_at FROM discord_webhooks ORDER BY id DESC
  `).all();
}

function createWebhook(serverId, name, url) {
  const result = db.prepare(`
    INSERT INTO discord_webhooks (server_id, name, url, created_at)
    VALUES (?, ?, ?, ?)
  `).run(serverId || null, name, url, Date.now());
  return db.prepare(`SELECT id, server_id, name, enabled, created_at FROM discord_webhooks WHERE id = ?`)
    .get(result.lastInsertRowid);
}

function deleteWebhook(id) {
  return db.prepare(`DELETE FROM discord_webhooks WHERE id = ?`).run(id).changes;
}

module.exports = { notifyServer, listWebhooks, createWebhook, deleteWebhook };
