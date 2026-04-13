const { ObjectId } = require("mongodb");
const config = require("../config");

function col(db) {
  return db.collection(config.pendingSignupsCollection);
}

async function ensurePendingSignupIndexes(db) {
  await col(db).createIndex({ email: 1 }, { unique: true });
}

/**
 * Replaces any prior pending row for this email and inserts a new pending signup with the given `_id`.
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').ObjectId} _id
 * @param {{ email: string, password_hash: string, display_name: string, display_name_lc: string }} payload
 * @param {{ hash: string, expires_at: Date }} signupOtp
 */
async function replacePendingSignup(db, _id, payload, signupOtp) {
  const now = new Date();
  await col(db).deleteMany({ email: payload.email });
  const doc = {
    _id,
    email: payload.email,
    password_hash: payload.password_hash,
    display_name: payload.display_name,
    display_name_lc: payload.display_name_lc,
    signup_otp: signupOtp,
    created_at: now,
    updated_at: now,
  };
  await col(db).insertOne(doc);
  return doc;
}

async function findPendingSignupById(db, id) {
  let oid;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }
  return col(db).findOne({ _id: oid });
}

async function deletePendingSignupById(db, id) {
  let oid;
  try {
    oid = new ObjectId(id);
  } catch {
    return;
  }
  await col(db).deleteOne({ _id: oid });
}

module.exports = {
  ensurePendingSignupIndexes,
  replacePendingSignup,
  findPendingSignupById,
  deletePendingSignupById,
};
