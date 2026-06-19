const path = require("path");

function resolveProjectPath(configuredPath, fallbackPath) {
  if (!configuredPath) return fallbackPath;
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(__dirname, "..", configuredPath);
}

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DESKTOP_BUILD_DIR = path.join(PROJECT_ROOT, "build");
const ANDROID_BUILD_DIR = resolveProjectPath(
  process.env.ANDROID_BUILD_DIR,
  DESKTOP_BUILD_DIR
);
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const DEFAULT_ALARM_AUDIO_FILE = path.join(PUBLIC_DIR, "aidant-alarm-default.mp3");

const APK_FILE_ALIASES = {
  "ma-voix.apk": "ma-voix.apk",
  "ma-voix-aidant.apk": "ma-voix-aidant.apk",
  "ma-voix-aidant-s24-v1.1.1.apk": "ma-voix-aidant-s24-v1.1.1.apk",
  "ma-voix-aidant-s24-v1.1.0.apk": "ma-voix-aidant.apk",
  "ma-voix-aidant-stable-2c3ba01.apk": "ma-voix-aidant.apk",
  "ma-voix-aidant-1751-d5504ee9.apk": "ma-voix-aidant.apk",
};

module.exports = {
  ANDROID_BUILD_DIR,
  APK_FILE_ALIASES,
  DEFAULT_ALARM_AUDIO_FILE,
  DESKTOP_BUILD_DIR,
  PUBLIC_DIR,
};
