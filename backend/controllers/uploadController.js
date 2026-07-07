const fs = require('fs');
const ipfsService = require('../services/ipfsService');
const logger = require('../utils/logger');

const uploadFile = async (req, res, next) => {
  try {
    const ipfsHash = await ipfsService.pinFileToIPFS(req.file.path, req.file.originalname);
    
    res.status(200).json({ 
      status: 'success', 
      cid: ipfsHash 
    });
  } catch (error) {
    next(error);
  } finally {
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
