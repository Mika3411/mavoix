import express from "express";
import fs from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { registerClientBuildFallback } = require("./static-routes");

const tempDirs = [];

function createBuildDir() {
  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "ma-voix-build-"));
  tempDirs.push(buildDir);

  fs.mkdirSync(path.join(buildDir, "assets"), { recursive: true });
  fs.writeFileSync(
    path.join(buildDir, "index.html"),
    '<!doctype html><div id="root">Ma Voix</div>',
    "utf8"
  );
  fs.writeFileSync(
    path.join(buildDir, "assets", "app.js"),
    "console.log('ok');",
    "utf8"
  );

  return buildDir;
}

function createApp(buildDir) {
  const app = express();
  registerClientBuildFallback(app, {
    androidBuildDir: buildDir,
    desktopBuildDir: buildDir,
  });
  return app;
}

async function withTestServer(app, callback) {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    return await callback(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("static client routes", () => {
  afterEach(() => {
    while (tempDirs.length) {
      fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
    }
  });

  it("serves the client index for HTML navigation routes", async () => {
    await withTestServer(createApp(createBuildDir()), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/profil`, {
        headers: { Accept: "text/html" },
      });

      expect(response.status).toBe(200);
      expect(await response.text()).toContain("Ma Voix");
    });
  });

  it("does not serve the client index for missing build assets", async () => {
    await withTestServer(createApp(createBuildDir()), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/assets/missing.js`, {
        headers: { Accept: "*/*" },
      });

      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain("Ma Voix");
    });
  });

  it("serves existing build assets normally", async () => {
    await withTestServer(createApp(createBuildDir()), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/assets/app.js`);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("console.log('ok');");
    });
  });
});
