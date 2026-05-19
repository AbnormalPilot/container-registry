const { execFile } = require("child_process");
const express = require("express");
const config = require("../lib/config");
const registry = require("../lib/registry");
const { readGcStatus } = require("../lib/docker");

const router = express.Router();

function diskUsage(path) {
  return new Promise((resolve) => {
    execFile("du", ["-sk", path], (error, stdout) => {
      if (error) {
        resolve({ bytes: 0, error: error.message });
        return;
      }

      const kib = Number(stdout.trim().split(/\s+/)[0] || 0);
      resolve({ bytes: kib * 1024, error: null });
    });
  });
}

router.get("/system/info", async (req, res, next) => {
  try {
    const [counts, storage, gcStatus, version] = await Promise.all([
      registry.countRepositoriesAndTags(),
      diskUsage(config.registryDataPath),
      readGcStatus(),
      registry.pingRegistry()
    ]);

    return res.json({
      hostname: config.registryHostname,
      registryUrl: config.registryUrl,
      registryVersion: version.apiVersion,
      storageDriver: "filesystem",
      storageRoot: config.registryDataPath,
      authMode: "htpasswd",
      diskUsedBytes: storage.bytes,
      diskUsageError: storage.error,
      lastGcRunAt: gcStatus.lastRunAt,
      ...counts
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
