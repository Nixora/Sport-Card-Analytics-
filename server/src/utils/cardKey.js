/**
 * Match ingest_ebay._build_card_key (Python) for grouping.
 */
function cardKeyFromTitle(title) {
  if (!title || typeof title !== "string") return null;
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned.replace(/\s+/g, "_").slice(0, 120);
}

module.exports = { cardKeyFromTitle };
