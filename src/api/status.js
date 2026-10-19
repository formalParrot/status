const express = require("express");
const router = express.Router();

const {
  createServer,
  getServers,
  findServerById,
  findServerByTokenHash,
  getDailyUptime,
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

router.delete("/servers/:id", (req, res) => {
  const changes = deleteServerById(req.params.id);
  if (!changes) return res.status(404).json({ error: "Server not found" });
  res.status(204).end();
});

router.post("/servers", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Missing server name" });
  }
  
  const data = createServer(name)

  res.json(data)
});

module.exports = router;
