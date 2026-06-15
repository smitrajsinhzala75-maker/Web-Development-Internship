const express = require('express');
const router = express.Router();

router.get('/emails', (req, res) => {
  res.json(global.devEmailLog || []);
});

// Helper route to check if mock database is active
router.get('/status', (req, res) => {
  res.json({
    isMockDb: !!global.isMockDb,
    emailCount: (global.devEmailLog || []).length
  });
});

module.exports = router;
