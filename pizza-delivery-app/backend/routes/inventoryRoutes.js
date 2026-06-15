const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { auth, admin } = require('../middleware/auth');

router.get('/', auth, inventoryController.getInventory);
router.put('/update', auth, admin, inventoryController.updateStock);

module.exports = router;
