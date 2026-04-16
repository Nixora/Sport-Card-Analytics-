const { Binary } = require("mongodb");
const config = require("../config");

function col(db) {
  return db.collection(config.jobApplicationsCollection);
}

const ALLOWED_RESUME_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const KNOWN_CAREER_JOB_IDS = new Set([
  "senior-blockchain",
  "senior-fullstack",
  "senior-backend",
  "senior-frontend",
  "staff-engineer",
]);

function normalizeJobId(id) {
  const s = String(id || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(s)) return "";
  return s;
}

function isAllowedCareerJobId(id) {
  const n = normalizeJobId(id);
  return Boolean(n && KNOWN_CAREER_JOB_IDS.has(n));
}

function isNonEmptyHttpUrl(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function linkedinEmptyTemplate(linkedin) {
  const t = String(linkedin || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
  return t === "https://www.linkedin.com/in" || t === "https://linkedin.com/in";
}

function hasAtLeastOneSocial(linkedin, github, x) {
  const lin = String(linkedin || "").trim();
  const gh = String(github || "").trim();
  const tw = String(x || "").trim();
  if (isNonEmptyHttpUrl(gh) || isNonEmptyHttpUrl(tw)) return true;
  if (!isNonEmptyHttpUrl(lin)) return false;
  if (linkedinEmptyTemplate(lin)) return false;
  return true;
}

function normalizePhone(s) {
  return String(s || "").trim().slice(0, 24);
}

/**
 * @param {import('mongodb').Db} db
 * @param {object} params
 */
async function insertJobApplication(db, params) {
  const {
    job_id,
    job_title,
    name,
    location,
    phone,
    email,
    social_linkedin,
    social_github,
    social_x,
    resumeBuffer,
    resumeFilename,
    resumeContentType,
    ip,
    user_agent,
  } = params;

  const doc = {
    job_id,
    job_title: String(job_title || "").trim().slice(0, 200),
    name: String(name || "").trim().slice(0, 120),
    location: String(location || "").trim().slice(0, 200),
    phone: normalizePhone(phone),
    email: String(email || "").trim().toLowerCase().slice(0, 200),
    social_linkedin: String(social_linkedin || "").trim().slice(0, 500),
    social_github: String(social_github || "").trim().slice(0, 500),
    social_x: String(social_x || "").trim().slice(0, 500),
    resume_filename: String(resumeFilename || "resume").slice(0, 200),
    resume_content_type: String(resumeContentType || "application/octet-stream").slice(0, 120),
    resume_size: resumeBuffer?.length || 0,
    resume_data: resumeBuffer && resumeBuffer.length ? new Binary(resumeBuffer) : null,
    created_at: new Date(),
    ip: String(ip || "").slice(0, 80),
    user_agent: String(user_agent || "").slice(0, 400),
  };

  await col(db).insertOne(doc);
  return doc;
}

/**
 * @param {import('mongodb').Db} db
 */
async function listJobApplications(db, { page, limit }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (p - 1) * lim;

  const cursor = col(db).find(
    {},
    {
      projection: {
        resume_data: 0,
      },
      sort: { created_at: -1, _id: -1 },
      skip,
      limit: lim,
    }
  );
  const [total, rows] = await Promise.all([col(db).countDocuments({}), cursor.toArray()]);

  const items = rows.map((r) => ({
    id: String(r._id),
    job_id: r.job_id || "",
    job_title: r.job_title || "",
    name: r.name || "",
    location: r.location || "",
    phone: r.phone || "",
    email: r.email || "",
    social_linkedin: r.social_linkedin || "",
    social_github: r.social_github || "",
    social_x: r.social_x || "",
    resume_filename: r.resume_filename || "",
    resume_content_type: r.resume_content_type || "",
    resume_size: r.resume_size || 0,
    has_resume: Number(r.resume_size || 0) > 0,
    created_at: r.created_at || null,
  }));

  return { items, total, page: p, limit: lim };
}

/**
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').ObjectId} oid
 */
async function getJobApplicationWithResume(db, oid) {
  return col(db).findOne({ _id: oid });
}

module.exports = {
  ALLOWED_RESUME_MIME,
  normalizeJobId,
  isAllowedCareerJobId,
  isNonEmptyHttpUrl,
  hasAtLeastOneSocial,
  insertJobApplication,
  listJobApplications,
  getJobApplicationWithResume,
};
