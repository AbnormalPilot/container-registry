const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../lib/config");

function signSession(username) {
  return jwt.sign(
    {
      sub: username,
      username
    },
    config.jwtSecret,
    {
      algorithm: "HS256",
      expiresIn: config.jwtExpiresIn,
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      jwtid: crypto.randomUUID()
    }
  );
}

function requireJwt(req, res, next) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ error: { message: "Missing bearer token" } });
  }

  try {
    req.user = jwt.verify(match[1], config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      clockTolerance: 30
    });
    return next();
  } catch (error) {
    return res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
}

module.exports = { requireJwt, signSession };
