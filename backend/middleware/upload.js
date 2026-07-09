const multer = require('multer');
const { BadRequestError } = require('../utils/errorHandler');
const path = require('path');
const fs = require('fs');

// Automatically create the uploads directory if it does not exist (for diskStorage fallback/compat)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure upload caching storage - Using memoryStorage for Render compatibility
const storage = multer.memoryStorage();

// File validator rules
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new BadRequestError('Only image files (JPEG, JPG, PNG, GIF, WEBP, SVG) are allowed.'));
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max size
  }
});

module.exports = upload;
