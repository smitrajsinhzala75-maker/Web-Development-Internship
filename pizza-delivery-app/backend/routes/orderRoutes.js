const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth, admin } = require('../middleware/auth');

router.post('/create', auth, orderController.createOrder);
router.post('/verify', auth, orderController.verifyPayment);
router.get('/', auth, orderController.getOrders);
router.put('/:orderId/status', auth, admin, orderController.updateOrderStatus);

module.exports = router;
