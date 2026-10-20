const express = require("express");
const router = express.Router();
const authenticateAdminSession = require("../middleware/adminSession").authenticateAdminSession;
const {
  resetUptime,
  listMaintenance, createMaintenance, endMaintenance, getMaintenance,
  listIncidents, createIncident, resolveIncident, updateIncident, deleteIncident
} = require("../services/serverService");
const { listWebhooks, createWebhook, deleteWebhook } = require("../services/webhookService");
const { notifyServer } = require("../services/webhookService");

router.use(authenticateAdminSession);

router.post("/servers/:id/reset-uptime", (req, res) => {
  const resetAt = resetUptime(req.params.id);
  if (!resetAt) return res.status(404).json({ error: "Server not found" });
  res.json({ id: Number(req.params.id), uptimeResetAt: resetAt });
});

router.get("/maintenance/:serverId", (req, res) => res.json(listMaintenance(req.params.serverId)));
router.post("/maintenance", (req, res) => {
  const { serverId, title, startsAt, endsAt } = req.body;
  if (!serverId || !title || !Number.isFinite(Number(startsAt))) {
    return res.status(400).json({ error: "serverId, title, and startsAt are required" });
  }
  const maintenance = createMaintenance(serverId, title, Number(startsAt), endsAt ? Number(endsAt) : null);
  notifyServer(serverId, "maintenance started", `${title} started.`).catch(() => {});
  res.status(201).json(maintenance);
});
router.post("/maintenance/:id/end", (req, res) => {
  const maintenance = getMaintenance(req.params.id);
  if (!endMaintenance(req.params.id)) return res.status(404).json({ error: "Maintenance not found" });
  if (maintenance) notifyServer(maintenance.server_id, "maintenance ended", `${maintenance.title} ended.`).catch(() => {});
  res.status(204).end();
});

router.get("/incidents", (req, res) => res.json(listIncidents()));
router.post("/incidents", (req, res) => {
  const { serverId, title, description } = req.body;
  if (!title) return res.status(400).json({ error: "Incident title is required" });
  const incident = createIncident(serverId, title, description);
  if (serverId) notifyServer(serverId, "incident opened", title).catch(() => {});
  res.status(201).json(incident);
});
router.post("/incidents/:id/resolve", (req, res) => {
  const incident = listIncidents().find((item) => String(item.id) === String(req.params.id));
  if (!resolveIncident(req.params.id)) return res.status(404).json({ error: "Open incident not found" });
  if (incident?.server_id) notifyServer(incident.server_id, "incident resolved", incident.title).catch(() => {});
  res.status(204).end();
});
router.patch("/incidents/:id", (req, res) => {
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  if (!title) return res.status(400).json({ error: "Incident title is required" });
  if (!updateIncident(req.params.id, title, req.body.description)) return res.status(404).json({ error: "Incident not found" });
  res.json(listIncidents().find((incident) => String(incident.id) === String(req.params.id)));
});
router.delete("/incidents/:id", (req, res) => {
  if (!deleteIncident(req.params.id)) return res.status(404).json({ error: "Incident not found" });
  res.status(204).end();
});

router.get("/webhooks", (req, res) => res.json(listWebhooks()));
router.post("/webhooks", (req, res) => {
  const { serverId, name, url } = req.body;
  if (!name || !url || !/^https:\/\/discord(?:app)?\.com\/api\/webhooks\//.test(url)) {
    return res.status(400).json({ error: "A name and valid Discord webhook URL are required" });
  }
  res.status(201).json(createWebhook(serverId, name, url));
});
router.delete("/webhooks/:id", (req, res) => {
  if (!deleteWebhook(req.params.id)) return res.status(404).json({ error: "Webhook not found" });
  res.status(204).end();
});

module.exports = router;
