const { Resend } = require("resend");
const config = require("../config");

function resendClient() {
  const key = String(config.resendApiKey || "").trim();
  if (!key) return null;
  return new Resend(key);
}

function isEmailConfigured() {
  return Boolean(String(config.resendApiKey || "").trim() && String(config.resendFromLine || "").trim());
}

function normalizeFromHeader(s) {
  return String(s || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim();
}

/**
 * @param {{ to: string, subject: string, html: string, text: string, replyTo?: string, from?: string }} opts
 */
async function sendTransactional(opts) {
  const { to, subject, html, text, replyTo, from: fromOverride } = opts;
  const client = resendClient();
  const from = normalizeFromHeader(fromOverride || config.resendFromLine);

  if (!client || !from) {
    if (config.nodeEnv !== "production") {
      console.warn(
        "[email] Skipping Resend (set RESEND_API_KEY in root .env). To: %s — %s",
        to,
        subject
      );
    }
    return { skipped: true };
  }

  const { data, error } = await client.emails.send({
    from,
    to: [to],
    subject,
    html,
    text,
    replyTo: replyTo ? [replyTo] : undefined,
  });

  if (error) {
    const e = new Error(error.message || "Could not send email");
    e.status = 502;
    throw e;
  }
  return { id: data?.id };
}

async function sendSignupOtpEmail(to, code) {
  const name = config.appPublicName;
  const subject = `${name} verify your email`;
  const text = `Your ${name} sign-up verification code is ${code}. It expires in 10 minutes. If you did not create an account, ignore this message.`;
  const html = `<p>Your <strong>${name}</strong> sign-up verification code is:</p><p style="font-size:22px;letter-spacing:0.2em;font-weight:700">${code}</p><p>Enter this code to finish creating your account. It expires in 10 minutes.</p><p>If you did not sign up, you can ignore this email.</p>`;
  return sendTransactional({ to, subject, html, text });
}

async function sendPasswordResetLinkEmail(to, resetUrl) {
  const name = config.appPublicName;
  const subject = `${name} reset your password`;
  const text = `Reset your ${name} password by opening this link (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request a reset, ignore this email.`;
  const html = `<p>We received a request to reset your <strong>${name}</strong> password.</p><p><a href="${resetUrl}" style="display:inline-block;margin:12px 0;padding:12px 20px;background:#0b4a6f;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset password</a></p><p style="font-size:13px;color:#555">Or copy this link into your browser:<br/><span style="word-break:break-all">${resetUrl}</span></p><p style="font-size:13px;color:#555">This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>`;
  return sendTransactional({ to, subject, html, text });
}

/**
 * Sends a support contact email to the configured support inbox.
 * @param {{ to: string, subject: string, messageText: string, replyTo?: string, meta?: Record<string, any> }} opts
 */
async function sendSupportContactEmail(opts) {
  const to = String(opts?.to || "").trim();
  const subject = String(opts?.subject || "").trim();
  const messageText = String(opts?.messageText || "").trim();
  const replyTo = String(opts?.replyTo || "").trim();
  if (!to || !subject || !messageText) {
    const e = new Error("Missing contact email fields");
    e.status = 400;
    throw e;
  }
  const meta = opts?.meta && typeof opts.meta === "object" ? opts.meta : {};
  const metaJson = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
  const text = [messageText, metaJson ? "\n---\nMeta:\n" + metaJson : ""].join("\n").trim();
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.5">
      <p style="margin:0 0 12px; white-space:pre-wrap">${escapeHtml(messageText)}</p>
      ${
        metaJson
          ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
             <pre style="background:#0b1220;color:#e5e7eb;padding:12px;border-radius:10px;overflow:auto;white-space:pre-wrap">${escapeHtml(metaJson)}</pre>`
          : ""
      }
    </div>
  `.trim();
  const from = normalizeFromHeader(config.contactResendFromLine || "");
  return sendTransactional({ to, subject, html, text, replyTo, from: from || undefined });
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = {
  isEmailConfigured,
  sendSignupOtpEmail,
  sendPasswordResetLinkEmail,
  sendSupportContactEmail,
};
