/** Deep-merge `over` onto a clone of `base`. Arrays from `over` replace entirely. */
export function mergeDeep(base, over) {
  if (over === undefined || over === null) {
    return base === undefined ? base : structuredClone(base);
  }
  if (Array.isArray(over)) {
    return over.map((item) => (item && typeof item === "object" && !Array.isArray(item) ? mergeDeep({}, item) : item));
  }
  if (typeof over !== "object") {
    return over;
  }
  const b = base && typeof base === "object" && !Array.isArray(base) ? base : {};
  const out = { ...b };
  for (const k of Object.keys(over)) {
    const bv = b[k];
    const ov = over[k];
    if (ov === undefined) continue;
    if (Array.isArray(ov)) {
      out[k] = mergeDeep([], ov);
    } else if (ov && typeof ov === "object") {
      out[k] = mergeDeep(bv && typeof bv === "object" && !Array.isArray(bv) ? bv : {}, ov);
    } else {
      out[k] = ov;
    }
  }
  return out;
}
