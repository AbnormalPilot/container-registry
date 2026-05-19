const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const config = require("./lib/config");
const authRoutes = require("./routes/auth");
const repositoryRoutes = require("./routes/repositories");
const cleanupRoutes = require("./routes/cleanup");
const systemRoutes = require("./routes/system");
const { requireJwt } = require("./middleware/auth");

const app = express();

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: false }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  if (req.originalUrl !== "/health") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api", requireJwt, repositoryRoutes, cleanupRoutes, systemRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { message: "Not found" } });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  const status = Number(error.status || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const body = {
    error: {
      message: error.message || "Internal server error"
    }
  };

  if (error.details) body.error.details = error.details;
  if (error.gcStatus) body.gcStatus = error.gcStatus;

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} failed:`, error);
  return res.status(safeStatus).json(body);
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Registry dashboard API listening on port ${config.port}`);
});
