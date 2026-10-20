const crypto = require("crypto");
const { authenticateAdminSession } = require("./adminSession");

const adminPin = process.env.ADMIN_PIN;

function authenticateAdmin(req, res, next) {
  if (req.get("x-admin-session") || req.cookies?.["parrot-admin-session"]) {
    return authenticateAdminSession(req, res, next);
  }
  if (!/^\d{6}$/.test(adminPin || "")) {
    console.error("ADMIN_PIN is not configured as a six-digit PIN; refusing admin request");
    return res.status(503).json({ error: "Admin authentication is unavailable" });
  }

  const providedKey = req.get("x-admin-pin") || "";
  const provided = Buffer.from(providedKey);
  const expected = Buffer.from(adminPin);
  const valid = provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected);

  if (!valid) {
    return res.status(401).json({ error: "Invalid or missing admin key" });
  }

  next();
}

module.exports = authenticateAdmin;
