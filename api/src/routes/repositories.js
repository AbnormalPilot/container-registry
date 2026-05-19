const express = require("express");
const registry = require("../lib/registry");
const { runGarbageCollect } = require("../lib/docker");
const { withRegistryLock } = require("../lib/mutex");

const router = express.Router();

function decodePathPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

router.get("/repositories", async (req, res, next) => {
  try {
    const repositories = await registry.listRepositoriesWithSummary();
    return res.json({ repositories });
  } catch (error) {
    return next(error);
  }
});

router.get(/^\/repositories\/(.+)\/tags\/([^/]+)\/manifest$/, async (req, res, next) => {
  try {
    const repository = decodePathPart(req.params[0]);
    const tag = decodePathPart(req.params[1]);
    const details = await registry.getTagDetails(repository, tag, true);
    return res.json({ repository, ...details });
  } catch (error) {
    return next(error);
  }
});

router.delete(/^\/repositories\/(.+)\/tags\/([^/]+)$/, async (req, res, next) => {
  try {
    const repository = decodePathPart(req.params[0]);
    const tag = decodePathPart(req.params[1]);

    const result = await withRegistryLock(`delete ${repository}:${tag}`, async () => {
      const deleted = await registry.deleteTag(repository, tag);
      const gc = await runGarbageCollect();
      return { deleted, gc };
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.delete(/^\/repositories\/(.+)$/, async (req, res, next) => {
  try {
    const repository = decodePathPart(req.params[0]);

    const result = await withRegistryLock(`delete repository ${repository}`, async () => {
      const deleted = await registry.deleteRepository(repository);
      const gc = await runGarbageCollect();
      return { deleted, gc };
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get(/^\/repositories\/(.+)\/tags$/, async (req, res, next) => {
  try {
    const repository = decodePathPart(req.params[0]);
    const tags = await registry.listTagDetails(repository);
    return res.json({ repository, tags });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
