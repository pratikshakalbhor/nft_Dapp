const { BadRequestError } = require('../utils/errorHandler');

const validateUploadPayload = (req, res, next) => {
  if (!req.file) {
    return next(new BadRequestError('No file attachment uploaded.'));
  }
  next();
};

module.exports = {
  validateUploadPayload
};
