const fs = require("fs/promises");
const { Writable } = require("stream");
const Docker = require("dockerode");
const config = require("./config");

const docker = new Docker({ socketPath: "/var/run/docker.sock" });
const EMPTY_REGISTRY_REPOSITORIES_ERROR = "Path not found: /docker/registry/v2/repositories";

function createCollector() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    }
  });

  stream.text = () => Buffer.concat(chunks).toString("utf8");
  return stream;
}

async function findRegistryContainer() {
  const preferred = docker.getContainer(config.registryContainerName);

  try {
    await preferred.inspect();
    return preferred;
  } catch {
    const containers = await docker.listContainers({ all: false });
    const match = containers.find((container) => {
      const names = container.Names || [];
      const labels = container.Labels || {};
      return (
        names.includes(`/${config.registryContainerName}`) ||
        labels["com.docker.compose.service"] === "registry" ||
        labels["com.dokploy.service"] === "registry"
      );
    });

    if (!match) {
      const error = new Error(`Unable to find running registry container named ${config.registryContainerName}`);
      error.status = 503;
      throw error;
    }

    return docker.getContainer(match.Id);
  }
}

async function readGcStatus() {
  try {
    const content = await fs.readFile(config.gcStatusPath, "utf8");
    return JSON.parse(content);
  } catch {
    return {
      lastRunAt: null,
      startedAt: null,
      finishedAt: null,
      success: null,
      exitCode: null,
      stdout: "",
      stderr: "",
      error: null
    };
  }
}

async function writeGcStatus(status) {
  await fs.mkdir(config.configDir, { recursive: true });
  await fs.writeFile(config.gcStatusPath, `${JSON.stringify(status, null, 2)}\n`);
}

async function runGarbageCollect() {
  const startedAt = new Date().toISOString();
  const container = await findRegistryContainer();
  const exec = await container.exec({
    Cmd: [
      "registry",
      "garbage-collect",
      "/etc/docker/registry/config.yml",
      "--delete-untagged=true"
    ],
    AttachStdout: true,
    AttachStderr: true
  });

  const stdout = createCollector();
  const stderr = createCollector();
  const stream = await exec.start({ hijack: true, stdin: false });

  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    stream.on("end", finish);
    stream.on("close", finish);
    stream.on("error", reject);
    docker.modem.demuxStream(stream, stdout, stderr);
  });

  const inspect = await exec.inspect();
  const finishedAt = new Date().toISOString();
  const stdoutText = stdout.text();
  const stderrText = stderr.text();
  const emptyRegistryNoop = inspect.ExitCode === 1 && stderrText.includes(EMPTY_REGISTRY_REPOSITORIES_ERROR);
  const status = {
    lastRunAt: finishedAt,
    startedAt,
    finishedAt,
    success: inspect.ExitCode === 0 || emptyRegistryNoop,
    exitCode: emptyRegistryNoop ? 0 : inspect.ExitCode,
    rawExitCode: inspect.ExitCode,
    skipped: emptyRegistryNoop,
    stdout: emptyRegistryNoop ? "No repositories found; garbage collection skipped." : stdoutText,
    stderr: stderrText,
    error: inspect.ExitCode === 0 || emptyRegistryNoop ? null : `Garbage collection exited with code ${inspect.ExitCode}`
  };

  await writeGcStatus(status);

  if (!status.success) {
    const error = new Error(status.error);
    error.status = 500;
    error.gcStatus = status;
    throw error;
  }

  return status;
}

module.exports = {
  readGcStatus,
  runGarbageCollect
};
