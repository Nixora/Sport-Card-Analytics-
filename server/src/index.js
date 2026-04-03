const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const config = require("./config");

const apiRoutes = require("./routes/api");
const { closeDb } = require("./db");

const app = express();
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const isProd = config.nodeEnv === "production";
app.use(
  cors({
    // Dev: allow any browser origin (Vite on LAN/IP). Prod: lock to CLIENT_ORIGIN (comma-separated).
    origin: isProd ? config.clientOrigins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: "256kb" }));
app.use(morgan("combined"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.use("/api", apiRoutes);

if (config.webDist && isProd) {
  app.use(express.static(config.webDist, { maxAge: "1h" }));
  app.get("*", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(config.webDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: "Internal server error",
    message: config.clientOrigins.some((o) => o.includes("localhost"))
      ? String(err.message)
      : undefined,
  });
});

const server = app.listen(config.port, config.apiListenHost, () => {
  const host = config.apiListenHost;
  console.log(`API listening on http://${host}:${config.port}`);
  console.log(
    isProd ? `CORS: ${config.clientOrigins.join(", ")}` : "CORS: open (development only)"
  );
  if (config.webDist && isProd) {
    console.log(`Web UI: serving static files from ${config.webDist}`);
  } else if (isProd) {
    console.warn(
      "[web] No client dist found (build with: npm run build:web). Set WEB_DIST or add client/dist on the server."
    );
  } else if (config.webDist) {
    console.log(
      `[web] Dev mode: not serving ${config.webDist} (use NODE_ENV=production or npm run prod:vps to serve the built UI from Express)`
    );
  }
});

async function shutdown(signal) {
  console.log(`${signal} — closing…`);
  server.close();
  await closeDb();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
