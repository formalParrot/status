const { hashToken } = require('../utils/token');
const { findServerByTokenHash } = require('../services/serverService');

function authenticateServer(req, res, next) {
  const authHeader = req.headers.authorization || '';
    const [scheme, rawToken] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !rawToken) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

  const server = findServerByTokenHash(hashToken(rawToken));

  if (!server) {
      return res.status(401).json({ error: 'Invalid server token' });
  }

  req.server = server;
  next();
}

module.exports = authenticateServer;
