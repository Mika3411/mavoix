const fs = require("fs");
const path = require("path");

const pagePath = path.join(__dirname, "aidant-alert-page.html");
let cachedHtml = "";

function getCaregiverAlertPageHtml() {
  if (!cachedHtml) {
    cachedHtml = fs.readFileSync(pagePath, "utf8");
  }

  return cachedHtml;
}

module.exports = {
  getCaregiverAlertPageHtml,
};
