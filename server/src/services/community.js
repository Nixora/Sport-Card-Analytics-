const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const config = require("../config");

function articlesCol(db) {
  return db.collection(config.communityArticlesCollection);
}

let initDone = false;

async function initCommunity(db) {
  if (initDone) return;
  initDone = true;
  const c = articlesCol(db);
  await c.createIndex({ createdAt: -1 });
  const n = await c.countDocuments();
  if (n > 0) return;

  const seedDocs = [
    {
      title: "PSA vs SGC for modern rookies — what are you seeing?",
      body: "I've been crossing more cards to SGC for the slab look and faster turnaround. For 2010s basketball rookies, is anyone seeing a consistent resale gap vs PSA 10s on the same card?\n\nCurious about eBay realized prices vs other venues if you have examples.",
      tags: ["grading", "psa", "sgc", "rookies", "basketball"],
      authorId: "sample",
      authorDisplayName: "SlabHappy",
      createdAt: new Date("2026-03-18T14:22:00.000Z"),
      viewCount: 2939,
      likeCount: 12,
      helpfulVoters: Array.from({ length: 12 }, (_, i) => `seed_helpful_${i}`),
      answers: [
        {
          id: `ans_${crypto.randomBytes(8).toString("hex")}`,
          body: "On several 2019 Prizm silvers I tracked last month, PSA 10 closing prices were still ~12–18% higher than SGC 10 on similar lots. Sample size was small though.",
          authorId: "sample",
          authorDisplayName: "CompScanner",
          createdAt: new Date("2026-03-18T16:05:00.000Z").toISOString(),
        },
        {
          id: `ans_${crypto.randomBytes(8).toString("hex")}`,
          body: "If you care about liquidity, PSA still moves faster in my experience. SGC is catching up on eye appeal.",
          authorId: "sample",
          authorDisplayName: "LowPopHunter",
          createdAt: new Date("2026-03-19T09:40:00.000Z").toISOString(),
        },
      ],
    },
    {
      title: "Tips for photographing vintage wax without glare?",
      body: "Selling some 1980s wax boxes and my phone picks up ceiling light on the cello. Any cheap setup that works for you (diffuser, angle, polarizing filter)?",
      tags: ["vintage", "photography", "selling", "wax"],
      authorId: "sample",
      authorDisplayName: "AtticFinds",
      createdAt: new Date("2026-04-02T11:10:00.000Z"),
      viewCount: 812,
      likeCount: 4,
      helpfulVoters: Array.from({ length: 4 }, (_, i) => `seed_helpful_b_${i}`),
      answers: [
        {
          id: `ans_${crypto.randomBytes(8).toString("hex")}`,
          body: "Shoot next to a window on a cloudy day, or bounce a desk lamp off a white wall. Polarizing filter on a real camera helps a lot if you have one.",
          authorId: "sample",
          authorDisplayName: "StudioCardPix",
          createdAt: new Date("2026-04-02T18:30:00.000Z").toISOString(),
        },
      ],
    },
    {
      title: "Set building vs singles — how do you budget?",
      body: "Trying to finish 2024 flagship baseball. Do you buy boxes for fun and accept duplicates, or go straight to singles for the last 30% of the checklist?",
      tags: ["set-building", "baseball", "budget", "discussion"],
      authorId: "sample",
      authorDisplayName: "NinePocketPlanner",
      createdAt: new Date("2026-04-08T09:00:00.000Z"),
      viewCount: 441,
      likeCount: 0,
      helpfulVoters: [],
      answers: [],
    },
  ];

  await c.insertMany(seedDocs);
}

function parseObjectId(id) {
  const s = String(id || "").trim();
  if (!/^[a-f0-9]{24}$/i.test(s)) return null;
  try {
    return new ObjectId(s);
  } catch {
    return null;
  }
}

function newAnswerId() {
  return `ans_${crypto.randomBytes(8).toString("hex")}`;
}

function excerpt(body) {
  const t = String(body || "").replace(/\s+/g, " ").trim();
  if (t.length <= 200) return t;
  return `${t.slice(0, 197)}…`;
}

function normalizeTags(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const t of raw) {
    const s = String(t || "").trim().slice(0, 40);
    if (s && !out.includes(s) && out.length < 20) out.push(s);
  }
  return out;
}

function authorName(user) {
  const dn = String(user?.display_name || "").trim();
  if (dn) return dn;
  const em = String(user?.email || "").trim();
  if (em) return em.split("@")[0] || "Member";
  return "Member";
}

function toPublicArticle(doc, viewerUserId) {
  if (!doc) return null;
  const helpfulVoters = Array.isArray(doc.helpfulVoters) ? doc.helpfulVoters : [];
  const uid = viewerUserId != null ? String(viewerUserId) : null;
  const viewerMarkedHelpful = uid ? helpfulVoters.includes(uid) : false;
  const answers = (doc.answers || []).map((a) => ({
    id: a.id,
    body: a.body,
    authorId: a.authorId,
    authorDisplayName: a.authorDisplayName,
    createdAt: typeof a.createdAt === "string" ? a.createdAt : new Date(a.createdAt).toISOString(),
  }));
  return {
    id: String(doc._id),
    title: doc.title,
    body: doc.body,
    tags: doc.tags || [],
    authorId: doc.authorId,
    authorDisplayName: doc.authorDisplayName,
    createdAt:
      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString(),
    viewCount: doc.viewCount ?? 0,
    likeCount: doc.likeCount ?? 0,
    answers,
    viewerMarkedHelpful,
  };
}

function isMongoUserId(s) {
  return /^[a-f0-9]{24}$/i.test(String(s || "").trim());
}

/** Adds authorHasAvatar for OP and each answer (Mongo user ids with stored avatar binary). */
async function enrichArticleAvatars(db, article) {
  if (!article) return null;
  const ids = new Set();
  if (isMongoUserId(article.authorId)) ids.add(String(article.authorId).trim());
  for (const a of article.answers || []) {
    if (isMongoUserId(a.authorId)) ids.add(String(a.authorId).trim());
  }
  const idList = [...ids];
  let map = new Map();
  if (idList.length > 0) {
    const oids = idList.map((s) => new ObjectId(s));
    const rows = await db
      .collection(config.usersCollection)
      .find({ _id: { $in: oids } }, { projection: { avatar: 1 } })
      .toArray();
    map = new Map(
      rows.map((u) => [String(u._id), Boolean(u.avatar?.id && u.avatar.data != null)])
    );
  }
  return {
    ...article,
    authorHasAvatar: isMongoUserId(article.authorId) ? Boolean(map.get(String(article.authorId).trim())) : false,
    answers: (article.answers || []).map((a) => ({
      ...a,
      authorHasAvatar: isMongoUserId(a.authorId) ? Boolean(map.get(String(a.authorId).trim())) : false,
    })),
  };
}

function summaryFromDoc(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    tags: doc.tags || [],
    authorDisplayName: doc.authorDisplayName,
    createdAt:
      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString(),
    answerCount: (doc.answers || []).length,
    viewCount: doc.viewCount ?? 0,
    likeCount: doc.likeCount ?? 0,
    excerpt: excerpt(doc.body),
  };
}

async function listArticleSummaries(db) {
  await initCommunity(db);
  const docs = await articlesCol(db).find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(summaryFromDoc);
}

async function getArticleForRead(db, id, viewerUserId) {
  await initCommunity(db);
  const oid = parseObjectId(id);
  if (!oid) return null;
  const c = articlesCol(db);
  const doc = await c.findOneAndUpdate(
    { _id: oid },
    { $inc: { viewCount: 1 } },
    { returnDocument: "after" }
  );
  const base = toPublicArticle(doc, viewerUserId);
  return enrichArticleAvatars(db, base);
}

async function findArticleDoc(db, id) {
  await initCommunity(db);
  const oid = parseObjectId(id);
  if (!oid) return null;
  return articlesCol(db).findOne({ _id: oid });
}

async function findArticlePublic(db, id, viewerUserId) {
  const doc = await findArticleDoc(db, id);
  const base = toPublicArticle(doc, viewerUserId);
  return enrichArticleAvatars(db, base);
}

async function createArticle(db, user, payload) {
  await initCommunity(db);
  const title = String(payload?.title || "").trim();
  const body = String(payload?.body || "").trim();
  const tags = normalizeTags(payload?.tags);
  if (title.length < 3 || title.length > 200) {
    const e = new Error("Title must be 3–200 characters.");
    e.status = 400;
    throw e;
  }
  if (body.length < 1 || body.length > 20000) {
    const e = new Error("Article body must be 1–20,000 characters.");
    e.status = 400;
    throw e;
  }
  const doc = {
    title,
    body,
    tags,
    authorId: String(user._id),
    authorDisplayName: authorName(user),
    createdAt: new Date(),
    viewCount: 0,
    likeCount: 0,
    helpfulVoters: [],
    answers: [],
  };
  const r = await articlesCol(db).insertOne(doc);
  const inserted = await articlesCol(db).findOne({ _id: r.insertedId });
  const base = toPublicArticle(inserted, String(user._id));
  return enrichArticleAvatars(db, base);
}

async function addAnswer(db, articleId, user, payload) {
  await initCommunity(db);
  const body = String(payload?.body || "").trim();
  if (body.length < 1 || body.length > 8000) {
    const e = new Error("Answer must be 1–8,000 characters.");
    e.status = 400;
    throw e;
  }
  const oid = parseObjectId(articleId);
  if (!oid) {
    const e = new Error("Article not found");
    e.status = 404;
    throw e;
  }
  const answer = {
    id: newAnswerId(),
    body,
    authorId: String(user._id),
    authorDisplayName: authorName(user),
    createdAt: new Date().toISOString(),
  };
  const r = await articlesCol(db).updateOne({ _id: oid }, { $push: { answers: answer } });
  if (r.matchedCount === 0) {
    const e = new Error("Article not found");
    e.status = 404;
    throw e;
  }
  return findArticlePublic(db, articleId, String(user._id));
}

async function addHelpfulVote(db, articleId, user) {
  await initCommunity(db);
  const oid = parseObjectId(articleId);
  if (!oid) {
    const e = new Error("Article not found");
    e.status = 404;
    throw e;
  }
  const uid = String(user._id);
  const c = articlesCol(db);
  const r = await c.updateOne({ _id: oid, helpfulVoters: { $ne: uid } }, { $addToSet: { helpfulVoters: uid }, $inc: { likeCount: 1 } });
  if (r.matchedCount === 0) {
    const exists = await c.findOne({ _id: oid });
    if (!exists) {
      const e = new Error("Article not found");
      e.status = 404;
      throw e;
    }
    const baseA = toPublicArticle(exists, uid);
    return { article: await enrichArticleAvatars(db, baseA), alreadyVoted: true };
  }
  const doc = await c.findOne({ _id: oid });
  const baseB = toPublicArticle(doc, uid);
  return { article: await enrichArticleAvatars(db, baseB), alreadyVoted: false };
}

module.exports = {
  initCommunity,
  listArticleSummaries,
  getArticleForRead,
  findArticlePublic,
  createArticle,
  addAnswer,
  addHelpfulVote,
};
