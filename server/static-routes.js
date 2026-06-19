const express = require("express");
const fs = require("fs");
const path = require("path");

function isMobileRequest(req) {
  const ua = req.get("user-agent") || "";
  const clientHintMobile = req.get("sec-ch-ua-mobile") === "?1";
  return (
    clientHintMobile ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  );
}

function getClientBuildDir(req, desktopBuildDir, androidBuildDir) {
  if (isMobileRequest(req) && fs.existsSync(androidBuildDir)) {
    return androidBuildDir;
  }

  return desktopBuildDir;
}

function registerDownloadRoutes(app, { apkFileAliases, defaultAlarmAudioFile, publicDir }) {
  app.get(
    Object.keys(apkFileAliases).map((fileName) => "/" + fileName),
    (req, res, next) => {
      const requestedFileName = path.basename(req.path);
      const publicFileName = apkFileAliases[requestedFileName];
      const apkPath = publicFileName ? path.join(publicDir, publicFileName) : "";

      if (!apkPath || !fs.existsSync(apkPath)) {
        next();
        return;
      }

      res.type("application/vnd.android.package-archive");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=\"" + requestedFileName + "\""
      );
      res.sendFile(apkPath);
    }
  );

  app.get("/aidant-alarm-default.mp3", (_req, res, next) => {
    if (!fs.existsSync(defaultAlarmAudioFile)) {
      next();
      return;
    }

    res.type("audio/mpeg").sendFile(defaultAlarmAudioFile);
  });
}

function registerClientBuildFallback(app, { androidBuildDir, desktopBuildDir }) {
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (req.path.startsWith("/api/")) {
      next();
      return;
    }

    const buildDir = getClientBuildDir(req, desktopBuildDir, androidBuildDir);
    if (!fs.existsSync(buildDir)) {
      next();
      return;
    }

    express.static(buildDir, { index: false })(req, res, (staticError) => {
      if (staticError) {
        next(staticError);
        return;
      }

      const indexPath = path.join(buildDir, "index.html");
      if (fs.existsSync(indexPath) && req.accepts("html")) {
        res.sendFile(indexPath);
        return;
      }

      next();
    });
  });
}

module.exports = {
  registerClientBuildFallback,
  registerDownloadRoutes,
};
