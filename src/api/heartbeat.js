const express = require("express");
const router = express.Router();

const authenticateServer = require('../middleware/authenticateServer');

const { recordHeartbeat } = require("../services/serverService")

router.post("/", authenticateServer, (req, res) => {
  const { status, metrics } = req.body;
  recordHeartbeat(req.body.id, status, metrics);
  res.json({ ok: true })
});

module.exports = router;
