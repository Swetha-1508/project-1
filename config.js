"use strict";

// Use dotenv to read .env vars into Node
require("dotenv").config();

// Required environment variables
const ENV_VARS = [
  "PAGE_ID",
  "APP_ID",
  "PAGE_ACCESS_TOKEN",
  "APP_SECRET",
  "VERIFY_TOKEN",
  "APP_URL"
];

function checkEnvVariables() {
  ENV_VARS.forEach(key => {
    if (!process.env[key]) {
      console.error(`Missing required environment variable: ${key}`);
      process.exit(1);
    }
  });
}

module.exports = {
  checkEnvVariables,
  apiDomain: "https://graph.facebook.com",
  pageId: process.env.PAGE_ID,
  appId: process.env.APP_ID,
  pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
  appSecret: process.env.APP_SECRET,
  verifyToken: process.env.VERIFY_TOKEN,
  appUrl: process.env.APP_URL,
  personas: {},
  port: process.env.PORT || 3000,
  get apiUrl() {
    return `${this.apiDomain}/${this.apiVersion}`;
  },
  get webhookUrl() {
    return `${this.appUrl}/webhook`;
  },
  newPersonas: [],
};
