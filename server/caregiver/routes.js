const { registerCaregiverAlertRoutes } = require("./alerts");
const { registerCaregiverMessageRoutes } = require("./messages");
const { registerCaregiverPushRoutes } = require("./push");

function registerCaregiverRoutes(app) {
  require('./interventions').registerInterventionRoutes(app);
  registerCaregiverAlertRoutes(app);
  registerCaregiverMessageRoutes(app);
  registerCaregiverPushRoutes(app);
}

module.exports = {
  registerCaregiverRoutes,
};
