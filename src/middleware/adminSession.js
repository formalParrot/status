const crypto = require("crypto");

const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function createAdminSession() {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function isAdminSession(token) {
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function destroyAdminSession(token) {
  sessions.delete(token);
}

function authenticateAdminSession(req, res, next) {
  const token = req.get("x-admin-session") || req.cookies?.["parrot-admin-session"];
  if (!token || !isAdminSession(token)) {
    return res.status(401).json({ error: "Admin login required" });
  }
  next();
}

module.exports = {
  createAdminSession,
  destroyAdminSession,
  authenticateAdminSession
};
