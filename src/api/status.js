const express = require("express");
const router = express.Router();
const authenticateAdmin = require("../middleware/authenticateAdmin");
const PUBLIC_URL = (process.env.PUBLIC_URL || "https://status.justparrot.me").replace(/\/$/, "");

const {
  createServer,
  getServers,
  findServerById,
  findServerByTokenHash,
  updateServerTitle,
  getDailyUptime,
  resetUptime,
  listIncidents,
  listActiveMaintenance,
  deleteServerById
} = require("../services/serverService")

router.get("/servers", (req, res) => {
  const data = getServers()
  res.json(data)
});

router.get("/servers/:id", (req, res) => {
  const data = findServerById(req.params.id)
  if (!data) return res.status(404).json({ error: "Server not found" })
  res.json(data)
});

router.get("/servers/:id/uptime", (req, res) => {
  res.json(getDailyUptime(req.params.id))
})

router.get("/incidents", (req, res) => {
  res.json(listIncidents().filter((incident) => incident.status === "open"));
});

router.get("/maintenance", (req, res) => {
  res.json(listActiveMaintenance());
});

router.patch("/servers/:id", authenticateAdmin, (req, res) => {
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  if (!title) {
    return res.status(400).json({ error: "Missing server title" });
  }

  if (!updateServerTitle(req.params.id, title)) {
    return res.status(404).json({ error: "Server not found" });
  }

  res.json(findServerById(req.params.id));
});

router.post("/servers/:id/reset-uptime", authenticateAdmin, (req, res) => {
  const resetAt = resetUptime(req.params.id);
  if (!resetAt) {
    return res.status(404).json({ error: "Server not found" });
  }
  res.json({ id: Number(req.params.id), uptimeResetAt: resetAt });
});

router.delete("/servers/:id", authenticateAdmin, (req, res) => {
  const changes = deleteServerById(req.params.id);
  if (!changes) return res.status(404).json({ error: "Server not found" });
  res.status(204).end();
});

router.post("/servers", authenticateAdmin, (req, res) => {
  const title = req.body.title || req.body.name;

  if (!title) {
    return res.status(400).json({ error: "Missing server title" });
  }
  
  const data = createServer(title)

  const installUrl = `${PUBLIC_URL}/install.sh/${data.installToken}`;
  res.json({
    id: data.id,
    title: data.title,
    installUrl,
    rawToken: data.rawToken,
    installCommand: `curl -fsSL '${installUrl}' | sudo bash`,
    installTokenExpiresAt: data.installTokenExpiresAt
  })
});

module.exports = router;
