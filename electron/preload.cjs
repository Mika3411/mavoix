const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("maVoixDesktopApp", {
  isDesktopApp: true,
  platform: process.platform,
});
