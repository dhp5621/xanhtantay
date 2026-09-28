const fs = require("fs");
const path = require("path");

/**
 * Extends app.json. Android push (FCM) only works when the build contains the Firebase
 * config, so google-services.json is wired in whenever the file is present.
 */
module.exports = ({ config }) => {
  const googleServices = process.env.GOOGLE_SERVICES_JSON ?? path.join(__dirname, "google-services.json");
  if (fs.existsSync(googleServices)) config.android = { ...config.android, googleServicesFile: googleServices };
  return config;
};
