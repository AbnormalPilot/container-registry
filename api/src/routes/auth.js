const fs = require("fs/promises");
const express = require("express");
const bcrypt = require("bcryptjs");
const config = require("../lib/config");
const { signSession } = require("../middleware/auth");

const router = express.Router();

function normalizeBcryptHash(hash) {
  return hash.replace(/^\$2y\$/, "$2b$").replace(/^\$2x\$/, "$2b$");
}

async function readHtpasswdUsers() {
  const content = await fs.readFile(config.htpasswdPath, "utf8");
  const users = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const username = line.slice(0, separator);
    const hash = line.slice(separator + 1);
    users.set(username, normalizeBcryptHash(hash));
  }

  return users;
}

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return res.status(400).json({ error: { message: "Username and password are required" } });
    }

    let users;
    try {
      users = await readHtpasswdUsers();
    } catch (error) {
      error.status = 503;
      error.message = `Unable to read htpasswd file at ${config.htpasswdPath}`;
      throw error;
    }

    const hash = users.get(username);
    const valid = hash ? await bcrypt.compare(password, hash) : false;

    if (!valid) {
      return res.status(401).json({ error: { message: "Invalid username or password" } });
    }

    const token = signSession(username);
    return res.json({
      token,
      tokenType: "Bearer",
      expiresIn: config.jwtExpiresIn,
      user: { username }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
