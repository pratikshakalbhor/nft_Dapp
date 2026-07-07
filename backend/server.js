const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const server = app.listen(config.port, () => {
  logger.info(`Backend runtime running on http://localhost:${config.port} [Environment: ${config.env}]`);
});

// Safeguard against unhandled operational errors
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down server...', err);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down server...', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;