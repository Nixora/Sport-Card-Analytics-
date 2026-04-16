const express = require("express");
const multer = require("multer");
const config = require("../config");
const { getDb } = require("../db");
const { getCoverage } = require("../services/coverage");
const {
  listCards,
  getCardByKey,
  listingsForCard,
  SORT_API,
} = require("../services/cards");
const { getTopMovers } = require("../services/movers");
const { listSellers, getSellerProfile } = require("../services/sellers");
const {
  findUserByDisplayNameLc,
  findUserById,
  publicProfileView,
  getImageBuffer,
} = require("../services/users");
const { router: authRouter, requireUser, optionalUser } = require("./auth");
const community = require("../services/community");
const { router: adminRouter } = require("./admin");
const { sendTelegramContactMessage } = require("../services/telegram");
const { askDocChat } = require("../services/docChatRag");
const jobApplications = require("../services/jobApplications");
const jobApplyValidation = require("../services/jobApplyValidation");

const router = express.Router();

const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (jobApplications.ALLOWED_RESUME_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_RESUME_TYPE"));
    }
  },
});

router.use("/auth", authRouter);
// Admin endpoints (requires signed-in user + ADMIN_EMAILS match)
router.use("/admin", requireUser, adminRouter);

function normalizePublicProfileSlug(param) {
  return decodeURIComponent(String(param || "").trim()).toLowerCase();
}

router.get("/users/public/:displayName/profile", async (req, res, next) => {
  try {
    const db = await getDb();
    const slug = normalizePublicProfileSlug(req.params.displayName);
    if (!slug) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const u = await findUserByDisplayNameLc(db, slug);
    if (!u) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json({ profile: publicProfileView(u) });
  } catch (e) {
    next(e);
  }
});

router.get("/users/community/:userId/avatar", async (req, res, next) => {
  try {
    const s = String(req.params.userId || "").trim();
    if (!/^[a-f0-9]{24}$/i.test(s)) {
      res.status(404).end();
      return;
    }
    const db = await getDb();
    const user = await findUserById(db, s);
    if (!user?.avatar?.id || user.avatar.data == null) {
      res.status(404).end();
      return;
    }
    const got = getImageBuffer(user, user.avatar.id);
    if (!got?.buffer) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", got.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(got.buffer);
  } catch (e) {
    next(e);
  }
});

router.get("/users/public/:displayName/avatar", async (req, res, next) => {
  try {
    const db = await getDb();
    const slug = normalizePublicProfileSlug(req.params.displayName);
    if (!slug) {
      res.status(404).end();
      return;
    }
    const u = await findUserByDisplayNameLc(db, slug);
    if (!u?.avatar?.id) {
      res.status(404).end();
      return;
    }
    const got = getImageBuffer(u, u.avatar.id);
    if (!got?.buffer) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", got.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=600");
    res.send(got.buffer);
  } catch (e) {
    next(e);
  }
});

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sports-card-analytics-api" });
});

router.get("/meta", (_req, res) => {
  res.json({
    marketplaceId: config.ebayMarketplaceId,
    searchQuery: config.ebaySearchQuery || null,
    disclaimer: config.disclaimerAskingSample,
    cardSortOptions: Object.keys(SORT_API),
  });
});

router.post("/contact", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const topic = String(req.body?.topic || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (!topic) {
      return res.status(400).json({ error: "Please choose a topic." });
    }
    if (!message) {
      return res.status(400).json({ error: "Please enter a message." });
    }
    if (message.length > 8000) {
      return res.status(400).json({ error: "Message is too long." });
    }

    const subject = `[Nixsora contact] ${topic}`;
    const messageText = [
      `From: ${name || "(not provided)"}`,
      `Email: ${email}`,
      `Topic: ${topic}`,
      "",
      message,
    ].join("\n");

    await sendTelegramContactMessage({
      subject,
      messageText,
      meta: {
        ip: req.ip,
        userAgent: req.get("user-agent") || "",
        path: req.originalUrl,
      },
    });

    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

function handleResumeUpload(req, res, next) {
  uploadResume.single("resume")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "Resume file is too large (max 5 MB)." });
      return;
    }
    if (String(err.message || "") === "INVALID_RESUME_TYPE") {
      res.status(400).json({ error: "Resume must be PDF or Word (.doc, .docx)." });
      return;
    }
    next(err);
  });
}

router.post("/job-applications", handleResumeUpload, async (req, res, next) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      res.status(400).json({ error: "Please attach a resume (PDF or Word)." });
      return;
    }

    const job_id = jobApplications.normalizeJobId(req.body?.job_id);
    if (!job_id || !jobApplications.isAllowedCareerJobId(job_id)) {
      res.status(400).json({ error: "Invalid job." });
      return;
    }

    const job_title = String(req.body?.job_title || "").trim().slice(0, 200);
    const name = String(req.body?.name || "").trim();
    const location = String(req.body?.location || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const email = String(req.body?.email || "").trim();
    const social_linkedin = String(req.body?.social_linkedin || "").trim();
    const social_github = String(req.body?.social_github || "").trim();
    const social_x = String(req.body?.social_x || "").trim();

    if (!name || name.length < 2) {
      res.status(400).json({ error: "Please enter your name." });
      return;
    }
    if (!location) {
      res.status(400).json({ error: "Please enter your location (city / region)." });
      return;
    }
    if (!jobApplyValidation.isValidJobApplyPhone(phone)) {
      res.status(400).json({
        error:
          "Please enter a valid phone number (digits only with optional +, spaces, or parentheses; 8–15 digits).",
      });
      return;
    }
    const emailNorm = jobApplyValidation.normalizeJobApplyEmail(email);
    if (!jobApplyValidation.isValidJobApplyEmail(emailNorm)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }
    if (!jobApplications.hasAtLeastOneSocial(social_linkedin, social_github, social_x)) {
      res.status(400).json({
        error: "Add at least one social profile URL (https://…), for example LinkedIn.",
      });
      return;
    }

    const db = await getDb();
    await jobApplications.insertJobApplication(db, {
      job_id,
      job_title: job_title || job_id,
      name,
      location,
      phone,
      email: emailNorm,
      social_linkedin,
      social_github,
      social_x,
      resumeBuffer: file.buffer,
      resumeFilename: file.originalname || "resume",
      resumeContentType: file.mimetype,
      ip: req.ip,
      user_agent: req.get("user-agent") || "",
    });

    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/doc-chat", requireUser, async (req, res, next) => {
  try {
    const message = String(req.body?.message || "").trim();
    const locale = String(req.body?.locale || "en").trim();

    if (!message) {
      return res.status(400).json({ error: "Please enter a message." });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: "Message is too long." });
    }

    const { answer, sources } = await askDocChat({ message, locale });
    return res.json({
      answer,
      sources: Array.isArray(sources) ? sources : [],
    });
  } catch (e) {
    next(e);
  }
});

router.get("/coverage", async (_req, res, next) => {
  try {
    const db = await getDb();
    const body = await getCoverage(db);
    res.json(body);
  } catch (e) {
    next(e);
  }
});

router.get("/cards", async (req, res, next) => {
  try {
    const db = await getDb();
    const body = await listCards(db, req.query);
    res.json(body);
  } catch (e) {
    next(e);
  }
});

router.get("/sellers", async (req, res, next) => {
  try {
    const db = await getDb();
    const body = await listSellers(db, req.query);
    res.json(body);
  } catch (e) {
    next(e);
  }
});

router.get("/sellers/:sellerUsername", async (req, res, next) => {
  try {
    const db = await getDb();
    const body = await getSellerProfile(db, req.params.sellerUsername, req.query);
    if (!body) return res.status(404).json({ error: "Seller not found" });
    res.json(body);
  } catch (e) {
    next(e);
  }
});

router.get("/cards/:cardKey", async (req, res, next) => {
  try {
    const db = await getDb();
    const card = await getCardByKey(db, req.params.cardKey);
    if (!card) return res.status(404).json({ error: "Card not found" });
    res.json(card);
  } catch (e) {
    next(e);
  }
});

router.get("/cards/:cardKey/listings", async (req, res, next) => {
  try {
    const db = await getDb();
    const lim = parseInt(req.query.limit, 10) || 20;
    const listings = stripRaw(
      await listingsForCard(db, req.params.cardKey, lim)
    );
    res.json({ card_key: req.params.cardKey, listings });
  } catch (e) {
    next(e);
  }
});

function stripRaw(docs) {
  return docs.map((d) => {
    const { raw_item_summary, ...rest } = d;
    return rest;
  });
}

router.get("/movers", async (req, res, next) => {
  try {
    const db = await getDb();
    const items = await getTopMovers(db, req.query);
    res.json({
      items,
      minCountDefault: config.moversMinCount,
      disclaimer: config.disclaimerAskingSample,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/community/articles", async (_req, res, next) => {
  try {
    const db = await getDb();
    const articles = await community.listArticleSummaries(db);
    res.json({ articles });
  } catch (e) {
    next(e);
  }
});

router.get("/community/articles/:id", optionalUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const viewerId = req.authUser ? String(req.authUser._id) : null;
    const article = await community.getArticleForRead(db, req.params.id, viewerId);
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    res.json({ article });
  } catch (e) {
    next(e);
  }
});

router.post("/community/articles", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const created = await community.createArticle(db, req.authUser, req.body || {});
    res.status(201).json({ article: created });
  } catch (e) {
    if (e.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

router.post("/community/articles/:id/answers", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const article = await community.addAnswer(db, req.params.id, req.authUser, req.body || {});
    res.status(201).json({ article });
  } catch (e) {
    if (e.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

router.post("/community/articles/:id/helpful", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const { article, alreadyVoted } = await community.addHelpfulVote(db, req.params.id, req.authUser);
    res.json({ article, alreadyVoted });
  } catch (e) {
    if (e.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

module.exports = router;
