/** Client-side validation (keep in sync with server jobApplyValidation.js). */

export function isValidJobApplyEmail(email) {
  const e = String(email || "")
    .trim()
    .toLowerCase();
  if (!e || e.length > 254) return false;
  if (e.includes("..") || e.includes(" ") || e.startsWith("@") || e.endsWith("@")) return false;
  if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e)) return false;
  const at = e.indexOf("@");
  const domain = e.slice(at + 1);
  if (!domain.includes(".") || domain.length > 253) return false;
  const labels = domain.split(".");
  if (labels.some((l) => l.length < 1 || l.length > 63)) return false;
  return true;
}

export function isValidJobApplyPhone(phone) {
  const raw = String(phone || "").trim();
  if (!raw || raw.length > 24) return false;
  if (!/^\+?[0-9\s().-]+$/.test(raw)) return false;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}
