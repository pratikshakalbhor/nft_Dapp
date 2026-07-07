const rateLimit = require('express-rate-limit');

const ipfsUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // Max 30 file uploads per 15 minutes per IP
  message: {
    status: 'fail',
    message: 'Too many upload requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

module.exports = {
  ipfsUploadLimiter
};
