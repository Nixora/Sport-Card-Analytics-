export function getPath(obj, path) {
  if (!path || obj == null) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

/** Replace {{name}} in string with vars[name] */
export function interpolate(template, vars) {
  if (typeof template !== "string" || !vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    vars[name] != null ? String(vars[name]) : ""
  );
}
