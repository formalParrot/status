const crypto = require("crypto");

function generateToken(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const bytes = crypto.randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
  }

  return result;
}

function hashToken(token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  return hash;
}

module.exports = {
    generateToken,
    hashToken
};
