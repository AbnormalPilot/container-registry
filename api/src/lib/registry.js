const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const config = require("./config");

const MANIFEST_ACCEPT = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.docker.distribution.manifest.v2+json",
  "application/vnd.docker.distribution.manifest.v1+json"
].join(", ");

const client = axios.create({
  baseURL: config.registryUrl,
  timeout: 120000,
  auth: {
    username: config.registryUser,
    password: config.registryPassword
  }
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const registryError = error.response?.data?.errors?.[0];
    const wrapped = new Error(registryError?.message || error.message || "Registry request failed");
    wrapped.status = error.response?.status || 502;
    wrapped.details = registryError || error.response?.data;
    throw wrapped;
  }
);

function encodeRepositoryName(name) {
  return name.split("/").map(encodeURIComponent).join("/");
}

function encodeReference(reference) {
  return encodeURIComponent(reference);
}

function isNameUnknown(error) {
  return error?.status === 404 && error?.details?.code === "NAME_UNKNOWN";
}

function isManifestUnknown(error) {
  return error?.status === 404 && error?.details?.code === "MANIFEST_UNKNOWN";
}

function warnSkippedRepository(repository, error) {
  console.warn(
    `[${new Date().toISOString()}] Skipping stale catalog repository ${repository}: ${error.message}`
  );
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runNext() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
  return results;
}

async function listCatalog() {
  const repositories = [];
  let last;

  while (true) {
    const response = await client.get("/v2/_catalog", {
      params: last ? { n: 100, last } : { n: 100 }
    });

    const page = Array.isArray(response.data?.repositories) ? response.data.repositories : [];
    repositories.push(...page);

    if (!response.headers.link || page.length === 0) break;
    last = page[page.length - 1];
  }

  return [...new Set(repositories)].sort((a, b) => a.localeCompare(b));
}

async function listTags(repository) {
  const response = await client.get(`/v2/${encodeRepositoryName(repository)}/tags/list`);
  return Array.isArray(response.data?.tags) ? response.data.tags.sort((a, b) => a.localeCompare(b)) : [];
}

async function pingRegistry() {
  const response = await client.get("/v2/");
  return {
    apiVersion: response.headers["docker-distribution-api-version"] || "registry/2.0",
    status: response.status
  };
}

async function getManifest(repository, reference) {
  const response = await client.get(
    `/v2/${encodeRepositoryName(repository)}/manifests/${encodeReference(reference)}`,
    {
      headers: { Accept: MANIFEST_ACCEPT }
    }
  );

  return {
    manifest: response.data,
    digest: response.headers["docker-content-digest"] || null,
    mediaType: response.headers["content-type"] || response.data?.mediaType || null
  };
}

async function resolveDigest(repository, reference) {
  try {
    const response = await client.head(
      `/v2/${encodeRepositoryName(repository)}/manifests/${encodeReference(reference)}`,
      {
        headers: { Accept: MANIFEST_ACCEPT }
      }
    );
    if (response.headers["docker-content-digest"]) return response.headers["docker-content-digest"];
  } catch (error) {
    if (error.status && error.status !== 405) throw error;
  }

  const result = await getManifest(repository, reference);
  if (!result.digest) {
    const error = new Error(`Unable to resolve digest for ${repository}:${reference}`);
    error.status = 502;
    throw error;
  }
  return result.digest;
}

async function getBlob(repository, digest) {
  const response = await client.get(`/v2/${encodeRepositoryName(repository)}/blobs/${encodeReference(digest)}`);
  return response.data;
}

function calculateManifestSize(manifest) {
  if (!manifest || typeof manifest !== "object") return 0;

  if (Array.isArray(manifest.layers)) {
    const layerBytes = manifest.layers.reduce((sum, layer) => sum + Number(layer.size || 0), 0);
    return layerBytes + Number(manifest.config?.size || 0);
  }

  if (Array.isArray(manifest.manifests)) {
    return manifest.manifests.reduce((sum, item) => sum + Number(item.size || 0), 0);
  }

  return 0;
}

async function getCreatedAt(repository, manifest) {
  const digest = manifest?.config?.digest;
  if (!digest) return null;

  try {
    const configBlob = await getBlob(repository, digest);
    return configBlob?.created || null;
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] Unable to read config blob ${digest}: ${error.message}`);
    return null;
  }
}

async function getTagPushedAt(repository, tag) {
  const tagLink = path.join(
    config.registryDataPath,
    "docker/registry/v2/repositories",
    ...repository.split("/"),
    "_manifests/tags",
    tag,
    "current/link"
  );

  try {
    const stat = await fs.stat(tagLink);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}

async function getTagDetails(repository, tag, includeManifest = false) {
  const manifestResult = await getManifest(repository, tag);
  const [createdAt, pushedAt] = await Promise.all([
    getCreatedAt(repository, manifestResult.manifest),
    getTagPushedAt(repository, tag)
  ]);

  const details = {
    tag,
    digest: manifestResult.digest,
    mediaType: manifestResult.mediaType,
    size: calculateManifestSize(manifestResult.manifest),
    createdAt,
    pushedAt: pushedAt || createdAt
  };

  if (includeManifest) {
    details.manifest = manifestResult.manifest;
  }

  return details;
}

async function getRepositorySummary(repository) {
  const tags = await listTags(repository);
  const tagDetails = await mapLimit(tags, 5, (tag) => getTagDetails(repository, tag));

  return {
    name: repository,
    tagCount: tags.length,
    totalSize: tagDetails.reduce((sum, item) => sum + Number(item.size || 0), 0)
  };
}

async function getRepositorySummaryIfAvailable(repository) {
  try {
    return await getRepositorySummary(repository);
  } catch (error) {
    if (isNameUnknown(error)) {
      warnSkippedRepository(repository, error);
      return null;
    }

    throw error;
  }
}

async function listRepositoriesWithSummary() {
  const repositories = await listCatalog();
  const summaries = await mapLimit(repositories, 5, getRepositorySummaryIfAvailable);
  return summaries.filter((summary) => summary && summary.tagCount > 0);
}

async function listTagDetails(repository) {
  const tags = await listTags(repository);
  const details = await mapLimit(tags, 5, (tag) => getTagDetails(repository, tag));
  return details.sort((a, b) => {
    const aDate = Date.parse(a.pushedAt || a.createdAt || 0) || 0;
    const bDate = Date.parse(b.pushedAt || b.createdAt || 0) || 0;
    return bDate - aDate || a.tag.localeCompare(b.tag);
  });
}

async function deleteTag(repository, tag) {
  const digest = await resolveDigest(repository, tag);
  await client.delete(`/v2/${encodeRepositoryName(repository)}/manifests/${encodeReference(digest)}`);
  return { repository, tag, digest };
}

async function deleteManifestDigest(repository, digest) {
  await client.delete(`/v2/${encodeRepositoryName(repository)}/manifests/${encodeReference(digest)}`);
}

async function deleteRepository(repository) {
  const tagDetails = await listTagDetails(repository);
  const digests = [
    ...new Set(tagDetails.map((tag) => tag.digest).filter(Boolean))
  ];

  const deleted = [];
  for (const digest of digests) {
    try {
      await deleteManifestDigest(repository, digest);
      console.log(`[${new Date().toISOString()}] Deleted repository manifest ${repository}@${digest}`);
      deleted.push(digest);
    } catch (error) {
      if (isManifestUnknown(error)) {
        console.warn(`[${new Date().toISOString()}] Manifest already missing while deleting ${repository}@${digest}`);
        continue;
      }

      throw error;
    }
  }

  return {
    repository,
    deletedTags: tagDetails.map((tag) => tag.tag),
    deletedDigests: deleted,
    tagCount: tagDetails.length,
    digestCount: deleted.length
  };
}

async function countRepositoriesAndTags() {
  const repositories = await listCatalog();
  const tagLists = await mapLimit(repositories, 8, async (repository) => {
    try {
      return {
        repository,
        tags: await listTags(repository)
      };
    } catch (error) {
      if (isNameUnknown(error)) {
        warnSkippedRepository(repository, error);
        return null;
      }

      throw error;
    }
  });

  const availableTagLists = tagLists.filter((item) => item && item.tags.length > 0);

  return {
    totalRepositories: availableTagLists.length,
    totalImages: availableTagLists.length,
    totalTags: availableTagLists.reduce((sum, item) => sum + item.tags.length, 0)
  };
}

module.exports = {
  listCatalog,
  listTags,
  pingRegistry,
  getManifest,
  getTagDetails,
  listRepositoriesWithSummary,
  listTagDetails,
  deleteTag,
  deleteRepository,
  countRepositoriesAndTags,
  isNameUnknown
};
