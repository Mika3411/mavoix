const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { downloadArtifact } = require("@electron/get");
const unzipper = require("unzipper");

const electronVersion = require("electron/package.json").version;
const platform = "win32";
const arch = "x64";
const outputDir = path.join(__dirname, "..", "electron-dist", `${platform}-${arch}`);

async function isPrepared() {
  try {
    const version = await fsp.readFile(path.join(outputDir, "version"), "utf8");
    await fsp.access(path.join(outputDir, "electron.exe"));
    return version.trim() === electronVersion;
  } catch {
    return false;
  }
}

async function extractZip(zipPath, destination) {
  await new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: destination }))
      .on("close", resolve)
      .on("error", reject);
  });
}

async function main() {
  if (await isPrepared()) {
    console.log(`Distribution Electron déjà prête : ${path.relative(process.cwd(), outputDir)}`);
    return;
  }

  await fsp.rm(outputDir, { recursive: true, force: true });
  await fsp.mkdir(outputDir, { recursive: true });

  const zipPath = await downloadArtifact({
    version: electronVersion,
    platform,
    arch,
    artifactName: "electron",
  });

  await extractZip(zipPath, outputDir);

  console.log(`Distribution Electron préparée : ${path.relative(process.cwd(), outputDir)}`);
}

main().catch((error) => {
  console.error("Impossible de préparer la distribution Electron :", error);
  process.exit(1);
});
