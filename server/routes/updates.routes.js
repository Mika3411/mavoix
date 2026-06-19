const { getDesktopUpdateManifest } = require("../update-manifest");

function registerUpdateRoutes(app) {
  app.get(["/ma-voix-update.json", "/api/update/windows"], (_req, res) => {
    res.json(getDesktopUpdateManifest());
  });
}

module.exports = {
  registerUpdateRoutes,
};
