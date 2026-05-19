const fs = require("fs/promises");
const express = require("express");
const config = require("../lib/config");
const registry = require("../lib/registry");
const { readGcStatus, runGarbageCollect } = require("../lib/docker");
const { withRegistryLock } = require("../lib/mutex");

const router = express.Router();

const DEFAULT_POLICY = {
  keepCount: 10,
  keepDays: 30,
  updatedAt: null,
  lastAppliedAt: null
};

async function readPolicy() {
  try {
    const content = await fs.readFile(config.policyPath, "utf8");
    return { ...DEFAULT_POLICY, ...JSON.parse(content) };
  } catch {
    return DEFAULT_POLICY;
  }
}

async function writePolicy(policy) {
  await fs.mkdir(config.configDir, { recursive: true });
  await fs.writeFile(config.policyPath, `${JSON.stringify(policy, null, 2)}\n`);
}

function validatePolicy(input) {
  const keepCount = Number(input?.keepCount);
  const keepDays = Number(input?.keepDays);

  if (!Number.isInteger(keepCount) || keepCount < 1) {
    const error = new Error("keepCount must be an integer greater than or equal to 1");
    error.status = 400;
    throw error;
  }

  if (!Number.isInteger(keepDays) || keepDays < 1) {
    const error = new Error("keepDays must be an integer greater than or equal to 1");
    error.status = 400;
    throw error;
  }

  return { keepCount, keepDays };
}

function tagTime(tag) {
  return Date.parse(tag.pushedAt || tag.createdAt || "") || 0;
}

function selectTagsForDeletion(tags, policy) {
  const cutoff = Date.now() - policy.keepDays * 24 * 60 * 60 * 1000;
  const sorted = [...tags].sort((a, b) => tagTime(b) - tagTime(a) || a.tag.localeCompare(b.tag));

  return sorted.filter((tag, index) => {
    const time = tagTime(tag);
    const exceedsCount = index >= policy.keepCount;
    const exceedsAge = time > 0 && time < cutoff;
    return exceedsCount || exceedsAge;
  });
}

router.get("/gc/status", async (req, res, next) => {
  try {
    const status = await readGcStatus();
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

router.post("/gc/run", async (req, res, next) => {
  try {
    const gc = await withRegistryLock("garbage collection", runGarbageCollect);
    return res.json(gc);
  } catch (error) {
    return next(error);
  }
});

router.get("/cleanup/policy", async (req, res, next) => {
  try {
    return res.json(await readPolicy());
  } catch (error) {
    return next(error);
  }
});

router.post("/cleanup/policy", async (req, res, next) => {
  try {
    const values = validatePolicy(req.body);
    const existing = await readPolicy();
    const policy = {
      ...existing,
      ...values,
      updatedAt: new Date().toISOString()
    };

    await writePolicy(policy);
    return res.json(policy);
  } catch (error) {
    return next(error);
  }
});

router.post("/cleanup/run", async (req, res, next) => {
  try {
    const result = await withRegistryLock("cleanup policy", async () => {
      const policy = await readPolicy();
      const repositories = await registry.listCatalog();
      const deleted = [];
      const failed = [];

      for (const repository of repositories) {
        const tags = await registry.listTagDetails(repository);
        const toDelete = selectTagsForDeletion(tags, policy);

        for (const tag of toDelete) {
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] Cleanup deleting ${repository}:${tag.tag}`);

          try {
            const deletion = await registry.deleteTag(repository, tag.tag);
            deleted.push({ ...deletion, deletedAt: timestamp });
          } catch (error) {
            console.error(`[${new Date().toISOString()}] Cleanup failed for ${repository}:${tag.tag}: ${error.message}`);
            failed.push({ repository, tag: tag.tag, error: error.message });
          }
        }
      }

      const appliedAt = new Date().toISOString();
      await writePolicy({ ...policy, lastAppliedAt: appliedAt });
      const gc = await runGarbageCollect();

      return {
        policy: { ...policy, lastAppliedAt: appliedAt },
        deleted,
        failed,
        gc
      };
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
