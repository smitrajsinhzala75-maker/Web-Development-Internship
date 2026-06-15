const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');

// Initialize Razorpay
let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Helper to check stock availability for all items in order
const checkStock = async (items) => {
  for (const item of items) {
    // Check Base
    const base = await Inventory.findOne({ name: item.base.name, category: 'base' });
    if (!base || base.stock < 1) return { available: false, item: item.base.name };

    // Check Sauce
    const sauce = await Inventory.findOne({ name: item.sauce.name, category: 'sauce' });
    if (!sauce || sauce.stock < 1) return { available: false, item: item.sauce.name };

    // Check Cheese
    const cheese = await Inventory.findOne({ name: item.cheese.name, category: 'cheese' });
    if (!cheese || cheese.stock < 1) return { available: false, item: item.cheese.name };

    // Check Veggies
    for (const veg of item.veggies) {
      const dbVeg = await Inventory.findOne({ name: veg.name, category: 'veggies' });
      if (!dbVeg || dbVeg.stock < 1) return { available: false, item: veg.name };
    }

    // Check Meats
    for (const meat of item.meats) {
      const dbMeat = await Inventory.findOne({ name: meat.name, category: 'meat' });
      if (!dbMeat || dbMeat.stock < 1) return { available: false, item: meat.name };
    }
  }
  return { available: true };
};

// Helper to deduct stock and check thresholds
const deductStockAndNotify = async (items) => {
  const lowStockItems = [];

  for (const item of items) {
    // Helper to deduct 1 unit from stock
    const deduct = async (name, category) => {
      const updated = await Inventory.updateOne(
        { name, category },
        { $inc: { stock: -1 } }
      );
      
      // Get updated stock to check threshold
      const current = await Inventory.findOne({ name, category });
      if (current && current.stock < 20) {
        lowStockItems.push({ name: current.name, stock: current.stock, category: current.category });
      }
    };

    await deduct(item.base.name, 'base');
    await deduct(item.sauce.name, 'sauce');
    await deduct(item.cheese.name, 'cheese');

    for (const veg of item.veggies) {
      await deduct(veg.name, 'veggies');
    }
    for (const meat of item.meats) {
      await deduct(meat.name, 'meat');
    }
  }

  // Trigger low stock notifications if any items crossed the threshold
  if (lowStockItems.length > 0) {
    await triggerLowStockAlert(lowStockItems);
  }

  // Broadcast updated inventory to all sockets
  if (global.io) {
    const updatedInventory = await Inventory.find({});
    global.io.emit('inventoryUpdate', updatedInventory);
  }
};

const triggerLowStockAlert = async (lowStockItems) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@slicesandco.com';
  const itemListHtml = lowStockItems
    .map(i => `<li><strong>${i.name}</strong> (${i.category}): Only ${i.stock} remaining!</li>`)
    .join('');
  
  const textAlert = `Low Stock Alert!\nThe following items have fallen below the threshold value of 20:\n` +
    lowStockItems.map(i => `- ${i.name} (${i.category}): ${i.stock} remaining`).join('\n');

  await sendEmail({
    to: adminEmail,
    subject: '🚨 CRITICAL: Low Stock Warning - Slices & Co.',
    text: textAlert,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #ff3300; border-radius: 10px;">
        <h2 style="color: #ff3300; text-align: center;">🚨 Low Stock Warning 🚨</h2>
        <p>The following ingredients have fallen below the safe threshold of <strong>20 units</strong> after a recent order:</p>
        <ul style="font-size: 16px; line-height: 1.6;">
          ${itemListHtml}
        </ul>
        <p>Please restock these items in the Admin Inventory Panel immediately to avoid service disruptions.</p>
        <div style="text-align: center; margin-top: 35px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin" style="background-color: #ff3300; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px;">Go to Admin Panel</a>
        </div>
      </div>
    `
  });
};

exports.createOrder = async (req, res) => {
  try {
    const { items, totalAmount } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!items || items.length === 0 || !totalAmount) {
      return res.status(400).json({ message: 'Order items and amount are required' });
    }

    // 1. Check stock availability before creating order
    const stockStatus = await checkStock(items);
    if (!stockStatus.available) {
      return res.status(400).json({ 
        message: `Oops! We ran out of stock for: ${stockStatus.item}. Please remove it or choose an alternative.` 
      });
    }

    let razorpayOrderId = null;

    // 2. Create Razorpay order if Razorpay key is present
    if (razorpayInstance) {
      try {
        const options = {
          amount: Math.round(totalAmount * 100), // amount in paisa
          currency: 'INR',
          receipt: 'receipt_order_' + Math.random().toString(36).substring(2, 11),
        };
        const order = await razorpayInstance.orders.create(options);
        razorpayOrderId = order.id;
      } catch (err) {
        console.error('Razorpay Order Creation Failed:', err);
        // Don't fail the request, fallback to mock order ID
      }
    }

    // Fallback to mock order ID if Razorpay failed or was not configured
    if (!razorpayOrderId) {
      razorpayOrderId = 'rp_mock_' + Math.random().toString(36).substring(2, 11);
    }

    // 3. Create the pending order in database
    const newOrder = await Order.create({
      userId,
      userEmail,
      items,
      totalAmount,
      razorpayOrderId,
      paymentStatus: 'pending',
      status: 'Order Received'
    });

    res.status(201).json({
      orderId: newOrder._id || newOrder.id,
      razorpayOrderId,
      amount: totalAmount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKey12345',
      isMockPayment: !razorpayInstance
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ message: 'Server error creating order' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { 
      orderId, 
      razorpayPaymentId, 
      razorpayOrderId, 
      razorpaySignature,
      isMockSuccess 
    } = req.body;

    const dbOrder = await Order.findById(orderId);
    if (!dbOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let verified = false;

    // Check if it's a mock payment (no signature verification needed, just admin consent/mock confirmation)
    if (isMockSuccess || !razorpayInstance) {
      verified = true;
    } else if (razorpayInstance && razorpaySignature) {
      // Real Razorpay signature verification
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature === razorpaySignature) {
        verified = true;
      }
    }

    if (!verified) {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' });
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Update order status to paid
    const updatedOrder = await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'paid',
      razorpayPaymentId: razorpayPaymentId || 'pay_mock_' + Math.random().toString(36).substring(2, 11)
    });

    // Deduct stock after successful payment
    await deductStockAndNotify(dbOrder.items);

    // Broadcast new order to Admin panel
    if (global.io) {
      const allOrders = await Order.find({});
      global.io.emit('orderUpdate', allOrders);
    }

    res.json({ 
      message: 'Payment verified and order placed successfully!',
      order: updatedOrder 
    });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ message: 'Server error verifying payment' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      orders = await Order.find({});
    } else {
      orders = await Order.find({ userId: req.user.id });
    }
    res.json(orders);
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Order Received', 'In the kitchen', 'Sent to delivery'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, { status });
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Broadcast order status change in real-time
    if (global.io) {
      // Notify all clients of order updates
      const allOrders = await Order.find({});
      global.io.emit('orderUpdate', allOrders);
      // Specifically notify the user dashboard of their order update
      global.io.emit(`orderStatus_${orderId}`, { orderId, status });
    }

    res.json({ message: `Order status updated to "${status}"`, order: updatedOrder });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
};
