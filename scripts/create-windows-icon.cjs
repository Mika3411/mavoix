const fs = require("node:fs/promises");
const path = require("node:path");
const pngToIcoModule = require("png-to-ico");
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const sourceIcon = path.join(__dirname, "..", "public", "icon-512.png");
const outputIcon = path.join(__dirname, "..", "build-resources", "icon.ico");

async function main() {
  await fs.mkdir(path.dirname(outputIcon), { recursive: true });

  const icon = await pngToIco(sourceIcon);
  await fs.writeFile(outputIcon, icon);

  console.log(`Icône Windows générée : ${path.relative(process.cwd(), outputIcon)}`);
}

main().catch((error) => {
  console.error("Impossible de générer l'icône Windows :", error);
  process.exit(1);
});
