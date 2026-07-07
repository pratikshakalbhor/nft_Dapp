const config = require('../config');

const logger = {
  info: (msg, meta = '') => {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta);
  },
  warn: (msg, meta = '') => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, meta);
  },
  error: (msg, error = '') => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error);
  }
};

module.exports = logger;
