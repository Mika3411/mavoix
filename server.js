require("dotenv").config();

const express = require("express");
const cors = require("cors");

const {
  ANDROID_BUILD_DIR,
  APK_FILE_ALIASES,
  DEFAULT_ALARM_AUDIO_FILE,
  DESKTOP_BUILD_DIR,
  PUBLIC_DIR,
} = require("./server/config");
const { getCaregiverAlertPageHtml } = require("./server/aidant-alert-page");
const { registerCaregiverRoutes } = require("./server/caregiver");
const { createCorsOptions, securityHeaders } = require("./server/http");
const {
  registerClientBuildFallback,
  registerDownloadRoutes,
} = require("./server/static-routes");
const { getDesktopUpdateManifest } = require("./server/update-manifest");

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(cors(createCorsOptions()));
app.use(securityHeaders);
app.use(express.json({ limit: "32kb" }));

app.get("/aidant-alerte", (_req, res) => {
  res.type("html").send(getCaregiverAlertPageHtml());
});

registerDownloadRoutes(app, {
  apkFileAliases: APK_FILE_ALIASES,
  defaultAlarmAudioFile: DEFAULT_ALARM_AUDIO_FILE,
  publicDir: PUBLIC_DIR,
});

app.get(["/ma-voix-update.json", "/api/update/windows"], (_req, res) => {
  res.json(getDesktopUpdateManifest());
});

registerCaregiverRoutes(app);
registerClientBuildFallback(app, {
  androidBuildDir: ANDROID_BUILD_DIR,
  desktopBuildDir: DESKTOP_BUILD_DIR,
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on " + PORT);
});
