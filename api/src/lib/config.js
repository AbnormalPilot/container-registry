const path = require("path");

const configDir = process.env.CONFIG_DIR || "/config";

const config = {
  nodeEnv: process.env.NODE_ENV || "production",
  port: Number(process.env.PORT || 3000),
  registryUrl: process.env.REGISTRY_URL || "http://registry:5000",
  registryHostname: process.env.REGISTRY_HOSTNAME || "registry.yourdomain.com",
  registryUser: process.env.REGISTRY_USER || "admin",
  registryPassword: process.env.REGISTRY_PASSWORD || "change-me",
  registryContainerName: process.env.REGISTRY_CONTAINER_NAME || "registry",
  registryDataPath: process.env.REGISTRY_DATA_PATH || "/var/lib/registry",
  htpasswdPath: process.env.HTPASSWD_PATH || "/auth/htpasswd",
  configDir,
  policyPath: path.join(configDir, "cleanup-policy.json"),
  gcStatusPath: path.join(configDir, "gc-status.json"),
  jwtSecret: process.env.JWT_SECRET || "change-me-generate-a-long-random-secret",
  jwtIssuer: process.env.JWT_ISSUER || "registry-dashboard",
  jwtAudience: process.env.JWT_AUDIENCE || "registry-dashboard-ui",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h"
};

if (config.nodeEnv === "production" && config.jwtSecret.startsWith("change-me")) {
  console.warn("WARNING: JWT_SECRET is using the default value. Set a long random secret before production use.");
}

module.exports = config;
