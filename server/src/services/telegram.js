const config = require("../config");

function trimEnv(s) {
  return String(s || "").replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
}

function isTelegramConfigured() {
  return Boolean(trimEnv(config.telegramBotToken) && trimEnv(config.telegramContactChatId));
}

function truncate(s, maxLen) {
  const t = String(s || "");
  if (t.length <= maxLen) return t;
  return t.slice(0, Math.max(0, maxLen - 1)) + "…";
}

async function sendTelegramContactMessage(opts) {
  const token = trimEnv(config.telegramBotToken);
  const chatId = trimEnv(config.telegramContactChatId);
  if (!token || !chatId) {
    const e = new Error("Telegram is not configured (set TELEGRAM_BOT_TOKEN and TELEGRAM_CONTACT_CHAT_ID).");
    e.status = 500;
    throw e;
  }

  const subject = truncate(String(opts?.subject || "").trim(), 180);
  const messageText = String(opts?.messageText || "").trim();
  const meta = opts?.meta && typeof opts.meta === "object" ? opts.meta : {};

  const parts = [
    `📩 ${subject || "Contact message"}`,
    "",
    truncate(messageText, 3500),
  ];
  if (Object.keys(meta).length) {
    parts.push("", "---", truncate(JSON.stringify(meta, null, 2), 1200));
  }

  const text = parts.join("\n");
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data?.ok) {
    const desc = data?.description || `Telegram send failed (${resp.status})`;
    const e = new Error(desc);
    e.status = 502;
    throw e;
  }
  return { ok: true, messageId: data?.result?.message_id };
}

module.exports = {
  isTelegramConfigured,
  sendTelegramContactMessage,
};

