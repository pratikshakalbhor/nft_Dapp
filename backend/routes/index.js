const express = require('express');
const uploadRoutes = require('./uploadRoutes');

const router = express.Router();

router.use('/upload', uploadRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
