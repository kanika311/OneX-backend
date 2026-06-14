const MOBILE_RE = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
const TABLET_RE = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i;

export function parseDeviceType(userAgent = "") {
  const ua = String(userAgent);
  if (TABLET_RE.test(ua)) return "tablet";
  if (MOBILE_RE.test(ua)) return "mobile";
  if (ua.length > 0) return "desktop";
  return "unknown";
}

export function parseBrowser(userAgent = "") {
  const ua = String(userAgent);
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/MSIE|Trident/i.test(ua)) return "IE";
  return ua ? "Other" : "Unknown";
}

export function detectCountry(req) {
  const headers = req.headers || {};
  const candidates = [
    headers["cf-ipcountry"],
    headers["x-vercel-ip-country"],
    headers["x-country-code"],
    headers["cloudfront-viewer-country"],
  ];
  for (const raw of candidates) {
    const code = String(raw ?? "").trim().toUpperCase();
    if (code && code !== "XX" && code.length <= 64) return code;
  }
  return String(req.body?.country ?? "").trim().toUpperCase().slice(0, 64);
}

export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
}

export function normalizeStatus(raw) {
  const s = String(raw ?? "accepted").toLowerCase();
  if (s === "rejected" || s === "customized" || s === "accepted") return s;
  return "accepted";
}

export function normalizePreferences(input = {}, categories = {}) {
  const necessary = true;
  const analytics =
    input.analytics !== undefined ? Boolean(input.analytics) : Boolean(categories.analytics ?? true);
  const marketing =
    input.marketing !== undefined ? Boolean(input.marketing) : Boolean(categories.marketing ?? false);
  const functional =
    input.functional !== undefined ? Boolean(input.functional) : Boolean(categories.functional ?? true);
  return { necessary, analytics, marketing, functional };
}
