const mongoose = require('mongoose');
const mockDb = require('../utils/mockDb');

const OrderItemSchema = new mongoose.Schema({
  base: { name: String, price: Number },
  sauce: { name: String, price: Number },
  cheese: { name: String, price: Number },
  veggies: [{ name: String, price: Number }],
  meats: [{ name: String, price: Number }],
  price: { type: Number, required: true }
});

const OrderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  items: [OrderItemSchema],
  totalAmount: { type: Number, required: true },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  status: { 
    type: String, 
    enum: ['Order Received', 'In the kitchen', 'Sent to delivery'], 
    default: 'Order Received' 
  },
  createdAt: { type: Date, default: Date.now }
});

const MongooseOrder = mongoose.model('Order', OrderSchema);

const OrderProxy = {
  find: (...args) => global.isMockDb ? mockDb.orders.find(...args) : MongooseOrder.find(...args),
  findById: (...args) => global.isMockDb ? mockDb.orders.findById(...args) : MongooseOrder.findById(...args),
  create: (...args) => global.isMockDb ? mockDb.orders.create(...args) : MongooseOrder.create(...args),
  findByIdAndUpdate: (...args) => global.isMockDb ? mockDb.orders.findByIdAndUpdate(...args) : MongooseOrder.findByIdAndUpdate(...args),
  mongooseModel: MongooseOrder
};

module.exports = OrderProxy;
