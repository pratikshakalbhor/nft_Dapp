const express = require('express');
const uploadController = require('../controllers/uploadController');
const uploadMiddleware = require('../middleware/upload');
const securityMiddleware = require('../middleware/security');
const validator = require('../validators/uploadValidator');

const router = express.Router();

router.post(
  '/',
  securityMiddleware.ipfsUploadLimiter,
  uploadMiddleware.single('file'),
  validator.validateUploadPayload,
  uploadController.uploadFile
);

module.exports = router;
