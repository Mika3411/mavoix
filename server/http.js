const DEFAULT_ALLOWED_ORIGINS = [
  "https://mavoix.onrender.com",
  "https://mavoix.netlify.app",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4173",
  "http://localhost:5173",
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigins = Array.from(
  new Set([...DEFAULT_ALLOWED_ORIGINS, ...allowedOrigins])
);

function isAllowedCorsOrigin(origin) {
  if (!origin || corsOrigins.includes(origin)) return true;

  if (origin === "capacitor://localhost" || origin === "ionic://localhost") {
    return true;
  }

  try {
    const url = new URL(origin);
    return (
      ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(url.hostname) &&
      ["http:", "https:"].includes(url.protocol)
    );
  } catch {
    return false;
  }
}

function createCorsOptions() {
  return {
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origine non autorisée par CORS"));
    },
  };
}

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (
    req.path.startsWith("/api/") ||
    req.path === "/aidant-alerte" ||
    req.path === "/ma-voix-update.json" ||
    req.path.endsWith(".apk")
  ) {
    res.setHeader("Cache-Control", "no-store");
  }

  next();
}

module.exports = {
  createCorsOptions,
  securityHeaders,
};
