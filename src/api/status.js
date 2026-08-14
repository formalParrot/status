const express = require("express");
const router = express.Router();

const {
  createServer,
  getServers,
  findServerById,
  findServerByTokenHash,
} = require("../services/serverService")

router.get("/servers", (req, res) => {
  const data = getServers()

  res.json(data)
});

router.get("/servers/:id", (req, res) => {
  const data = findServerById(req.params.id)

  res.json(data)
});

module.exports = router;
