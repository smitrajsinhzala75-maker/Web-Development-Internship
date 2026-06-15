const mongoose = require('mongoose');
const mockDb = require('../utils/mockDb');

const InventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['base', 'sauce', 'cheese', 'veggies', 'meat'], 
    required: true 
  },
  price: { type: Number, required: true },
  stock: { type: Number, required: true }
});

const MongooseInventory = mongoose.model('Inventory', InventorySchema);

const InventoryProxy = {
  find: (...args) => global.isMockDb ? mockDb.inventory.find(...args) : MongooseInventory.find(...args),
  findOne: (...args) => global.isMockDb ? mockDb.inventory.findOne(...args) : MongooseInventory.findOne(...args),
  updateOne: (...args) => global.isMockDb ? mockDb.inventory.updateOne(...args) : MongooseInventory.updateOne(...args),
  mongooseModel: MongooseInventory
};

module.exports = InventoryProxy;
