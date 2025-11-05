export const sanitizeCallback = (raw) => {
  if (!raw) return "";
  try {
    const u = new URL(raw, window.location.origin);     // nhận cả absolute/relative
    if (u.origin !== window.location.origin) return ""; // chặn open-redirect
    const p = `${u.pathname}${u.search}${u.hash}`;
    return p.startsWith("/auth") ? "/" : p;             // tránh vòng lặp /auth
  } catch {
    return "";
  }
};
