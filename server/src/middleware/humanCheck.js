const config = require("../config");

/** Block /api/* until Turnstile verification cookie is set (when human check is enabled). */
function humanCheckApi(req, res, next) {
  if (!config.humanCheckEnabled) {
    next();
    return;
  }
  if (req.method === "OPTIONS") {
    next();
    return;
  }
  if (req.path.startsWith("/human/")) {
    next();
    return;
  }
  if (req.cookies[config.humanCookieName] === "1") {
    next();
    return;
  }
  res.status(403).json({
    error: "Human verification required",
    code: "HUMAN_REQUIRED",
  });
}

module.exports = { humanCheckApi };
