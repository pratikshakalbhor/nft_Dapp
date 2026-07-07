require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  pinataJwt: process.env.PINATA_JWT,
  env: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
