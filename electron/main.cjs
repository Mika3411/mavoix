const { app, BrowserWindow, shell, session } = require("electron");
const path = require("node:path");

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || "";

app.setAppUserModelId("com.mavoix.windows");

function isAppUrl(url) {
  if (!url) return false;

  if (DEV_SERVER_URL && url.startsWith(DEV_SERVER_URL)) {
    return true;
  }

  return url.startsWith("file://");
}

function openExternal(url) {
  shell.openExternal(url).catch((error) => {
    console.warn(`Impossible d'ouvrir le lien externe ${url}:`, error);
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    title: "Ma Voix",
    backgroundColor: "#0b1220",
    icon: path.join(__dirname, "..", "public", "icon-512.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url)) return;

    event.preventDefault();
    openExternal(url);
  });

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, "..", "build", "index.html"));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(["media", "notifications"].includes(permission));
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
