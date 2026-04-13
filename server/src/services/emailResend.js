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

/**
 * @param {{ to: string, subject: string, html: string, text: string }} opts
 */
async function sendTransactional(opts) {
  const { to, subject, html, text } = opts;
  const client = resendClient();
  const from = String(config.resendFromLine || "").trim();

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

module.exports = {
  isEmailConfigured,
  sendSignupOtpEmail,
  sendPasswordResetLinkEmail,
};
