const rateLimitBuckets = new Map();
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastRateLimitCleanupAt = 0;

function getClientRateLimitId(req) {
  const forwardedFor = req.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function cleanupRateLimitBuckets(now) {
  if (now - lastRateLimitCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;
  lastRateLimitCleanupAt = now;

  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (now - bucket.windowStart > bucket.windowMs * 2) {
      rateLimitBuckets.delete(key);
    }
  }
}

function enforceRateLimit(req, res, scope, limit, windowMs, parts = []) {
  const now = Date.now();
  cleanupRateLimitBuckets(now);

  const key = [
    scope,
    getClientRateLimitId(req),
    ...parts.map((part) => String(part || "")),
  ].join("|");
  const bucket =
    rateLimitBuckets.get(key) || {
      count: 0,
      windowStart: now,
      windowMs,
    };

  if (now - bucket.windowStart >= windowMs) {
    bucket.count = 0;
    bucket.windowStart = now;
    bucket.windowMs = windowMs;
  }

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  if (bucket.count <= limit) {
    return true;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.windowStart + windowMs - now) / 1000)
  );
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    error: "Trop de requêtes",
    details: "Trop de tentatives sur ce lien aidant. Réessaie dans un instant.",
  });
  return false;
}

module.exports = {
  enforceRateLimit,
};
