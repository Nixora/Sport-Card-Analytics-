/**
 * Load root project .env (same file as Python ingest / MERN stack).
 */
const path = require("path");
const dotenv = require("dotenv");

const rootEnvPath = path.resolve(__dirname, "..", "..", "..", ".env");
const result = dotenv.config({ path: rootEnvPath });
if (result.error && process.env.NODE_ENV !== "production") {
  console.warn(
    "[env] Root .env not found or empty at %s — relying on process env",
    rootEnvPath
  );
}

module.exports = {
  rootEnvPath,
};
