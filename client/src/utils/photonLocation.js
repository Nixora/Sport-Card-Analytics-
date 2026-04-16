/** Build a human-readable label from a Photon (Komoot) / OSM feature. */

export function formatPhotonSuggestion(feature) {
  const p = feature?.properties || {};
  const streetLine =
    p.housenumber && p.street
      ? `${String(p.street).trim()} ${String(p.housenumber).trim()}`.trim()
      : p.street
        ? String(p.street).trim()
        : "";
  const bits = [
    p.name,
    streetLine,
    p.postcode,
    p.city || p.town || p.village || p.district,
    p.state || p.region,
    p.country,
  ]
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  const uniq = [];
  for (const b of bits) {
    if (!uniq.some((u) => u.toLowerCase() === b.toLowerCase())) uniq.push(b);
  }
  const label = uniq.join(", ").slice(0, 200);
  return label ? { label } : null;
}
