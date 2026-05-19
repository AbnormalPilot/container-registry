let queue = Promise.resolve();

function withRegistryLock(label, task) {
  const run = queue.then(async () => {
    console.log(`[${new Date().toISOString()}] Starting locked registry task: ${label}`);
    try {
      return await task();
    } finally {
      console.log(`[${new Date().toISOString()}] Finished locked registry task: ${label}`);
    }
  });

  queue = run.catch(() => undefined);
  return run;
}

module.exports = { withRegistryLock };
