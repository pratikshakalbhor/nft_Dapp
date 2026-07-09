const fs = require('fs');
const ipfsService = require('../services/ipfsService');
const logger = require('../utils/logger');

const uploadFile = async (req, res, next) => {
  try {
    let fileBuffer;
    if (req.file && req.file.buffer) {
      fileBuffer = req.file.buffer;
    } else if (req.file && req.file.path) {
      // Fallback for disk storage
      fileBuffer = fs.readFileSync(req.file.path);
    } else {
      return res.status(400).json({
        status: 'fail',
        message: 'No file attachment uploaded.'
      });
    }

    const ipfsHash = await ipfsService.pinFileToIPFS(
      fileBuffer,
      req.file.originalname,
      req.file.mimetype
    );
    
    res.status(200).json({ 
      status: 'success', 
      cid: ipfsHash 
    });
  } catch (error) {
    next(error);
  } finally {
    // Disk cleanup fallback: ensure uploaded files are properly cleaned up if disk storage was used
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          logger.error(`Disk cleanup error at path ${req.file.path}:`, err.message);
        } else {
          logger.info(`Temp upload file cleanup success: ${req.file.path}`);
        }
      });
    }
  }
};

module.exports = {
  uploadFile
};
