const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const config = require('../config');
const { InternalServerError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const pinFileToIPFS = async (filePath, originalName) => {
  try {
    if (!config.pinataJwt) {
      throw new Error('PINATA_JWT environment configuration is missing.');
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const metadata = JSON.stringify({
      name: originalName,
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    logger.info(`Pinning file "${originalName}" to IPFS via Pinata API...`);
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${config.pinataJwt}`,
        },
      }
    );

    return response.data.IpfsHash;
  } catch (error) {
    logger.error(`Pinata IPFS Pinning Error for "${originalName}":`, error.response?.data || error.message);
    throw new InternalServerError(
      error.response?.data?.error?.details || 'Failed to upload asset metadata to IPFS'
    );
  }
};

module.exports = {
  pinFileToIPFS,
};
