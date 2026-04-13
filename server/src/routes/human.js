const express = require("express");
const config = require("../config");

const router = express.Router();

router.get("/status", (req, res) => {
  res.json({
    required: Boolean(config.humanCheckEnabled),
    verified: req.cookies[config.humanCookieName] === "1",
  });
});

router.post("/verify", async (req, res) => {
  if (!config.humanCheckEnabled) {
    res.json({ ok: true });
    return;
  }
  const token = String(req.body?.token || "").trim();
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }
  try {
    const form = new URLSearchParams();
    form.set("secret", config.turnstileSecretKey);
    form.set("response", token);
    const ip = req.ip || req.socket?.remoteAddress;
    if (ip) form.set("remoteip", String(ip));

    const cfRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await cfRes.json();
    if (!data.success) {
      res.status(400).json({
        error: "Verification failed",
        message: Array.isArray(data["error-codes"]) ? data["error-codes"].join(", ") : undefined,
      });
      return;
    }
    res.cookie(config.humanCookieName, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: Boolean(config.authCookieSecure),
      maxAge: config.humanCookieMaxAgeSec * 1000,
      path: "/",
    });
    res.json({ ok: true });
  } catch {
    res.status(502).json({ error: "Verification service error" });
  }
});

module.exports = router;
