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

// Enable CORS with support for multiple domains (comma-separated config)
const allowedOrigins = config.corsOrigin ? config.corsOrigin.split(',').map(o => o.trim()) : ['*'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true
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
