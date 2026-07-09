const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./routes');
const globalErrorHandler = require('./middleware/errorHandler');
const { NotFoundError } = require('./utils/errorHandler');
const config = require('./config');

const app = express();

// Set security headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: config.corsOrigin
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route handler to prevent 404 errors on root access
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Stellar NFT Marketplace Backend is running.' });
});

// API routing
app.use('/api', apiRoutes);

// Fallback unknown routes to 404 error
app.use('*', (req, res, next) => {
  next(new NotFoundError(`Web resource not found for route ${req.originalUrl}`));
});

// Centralized error recovery middleware
app.use(globalErrorHandler);

module.exports = app;
