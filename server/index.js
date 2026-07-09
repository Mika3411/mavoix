require("dotenv").config();

const express = require("express");
const cors = require("cors");

const {
  ANDROID_BUILD_DIR,
  APK_FILE_ALIASES,
  DEFAULT_ALARM_AUDIO_FILE,
  DESKTOP_BUILD_DIR,
  PUBLIC_DIR,
} = require("./config");
const { getCaregiverAlertPageHtml } = require("./aidant-alert-page");
const { registerAssetLinksRoute } = require("./assetlinks");
const { registerCaregiverRoutes } = require("./routes/caregiver.routes");
const { createCorsOptions, securityHeaders } = require("./http");
const {
  registerClientBuildFallback,
  registerDownloadRoutes,
} = require("./routes/downloads.routes");
const { registerUpdateRoutes } = require("./routes/updates.routes");
const { getPrivacyPolicyHtml } = require("./privacy-policy-page");

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(cors(createCorsOptions()));
app.use(securityHeaders);
app.use(express.json({ limit: "32kb" }));

registerAssetLinksRoute(app);

app.get("/aidant-alerte", (_req, res) => {
  res.type("html").send(getCaregiverAlertPageHtml());
});

app.get(["/confidentialite", "/privacy"], (_req, res) => {
  res.type("html").send(getPrivacyPolicyHtml());
});

registerDownloadRoutes(app, {
  apkFileAliases: APK_FILE_ALIASES,
  defaultAlarmAudioFile: DEFAULT_ALARM_AUDIO_FILE,
  publicDir: PUBLIC_DIR,
});

registerUpdateRoutes(app);
registerCaregiverRoutes(app);
registerClientBuildFallback(app, {
  androidBuildDir: ANDROID_BUILD_DIR,
  desktopBuildDir: DESKTOP_BUILD_DIR,
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on " + PORT);
});
