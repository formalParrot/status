const crypto = require("crypto");

const adminKey = process.env.ADMIN_KEY;

function authenticateAdmin(req, res, next) {
  if (!adminKey) {
    console.error("ADMIN_KEY is not configured; refusing admin request");
    return res.status(503).json({ error: "Admin authentication is unavailable" });
  }

  const providedKey = req.get("x-admin-key") || "";
  const provided = Buffer.from(providedKey);
  const expected = Buffer.from(adminKey);
  const valid = provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected);

  if (!valid) {
    return res.status(401).json({ error: "Invalid or missing admin key" });
  }

  next();
}

module.exports = authenticateAdmin;
