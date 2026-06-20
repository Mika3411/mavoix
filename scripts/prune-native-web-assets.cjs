const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const targets = {
  android: path.join(rootDir, "android", "app", "src", "main", "assets", "public"),
  ios: path.join(rootDir, "ios", "App", "App", "public"),
};

const requestedTarget = process.argv[2];
const selectedTargets =
  requestedTarget && targets[requestedTarget]
    ? [[requestedTarget, targets[requestedTarget]]]
    : Object.entries(targets);

let removedCount = 0;

for (const [name, assetsDir] of selectedTargets) {
  if (!fs.existsSync(assetsDir)) {
    console.log(`Native ${name}: no web asset directory found.`);
    continue;
  }

  for (const entry of fs.readdirSync(assetsDir)) {
    if (!entry.toLowerCase().endsWith(".apk")) continue;

    const filePath = path.join(assetsDir, entry);
    fs.rmSync(filePath, { force: true });
    removedCount += 1;
    console.log(`Removed native bundled APK: ${path.relative(rootDir, filePath)}`);
  }
}

if (removedCount === 0) {
  console.log("No native bundled APK files to remove.");
}
