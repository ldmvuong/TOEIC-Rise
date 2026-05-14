export function isValidExternalVideoUrl(url) {
  const v = (url || "").trim();
  if (!v) return false;
  try {
    const parsed = new URL(v);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    return true;
  } catch {
    return false;
  }
}
